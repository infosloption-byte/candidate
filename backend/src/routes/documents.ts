import type { FastifyPluginAsync } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { requireAuth } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  validateDocumentUpload,
  type DocumentUploadInput,
} from '../domain/documentValidation.js';
import { deleteDocument, readDocument, saveDocument } from '../lib/documentStorage.js';

interface CandidateParams {
  candidateId: string;
}

interface DocumentParams extends CandidateParams {
  documentId: string;
}

const documentSelect = {
  id: true,
  candidateId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} as const;

const allowedToAccessCandidate = (
  user: NonNullable<FastifyRequest['authUser']>,
  agencyId: string,
  candidateId: string,
): boolean =>
  user.role === 'ADMIN'
  || (user.role === 'INTERVIEWEE' && user.candidateId === candidateId)
  || (user.role === 'AGENCY' && user.agencyId === agencyId)
  || (user.role === 'INTERVIEWER' && Boolean(user.id && candidateId));

const sanitizeDownloadName = (fileName: string): string => fileName.replace(/[\r\n"]/g, '_');

export const documentRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: CandidateParams }>(
    '/candidates/:candidateId/documents',
    { preHandler: requireAuth },
    async (request, reply) => {
      const candidate = await getPrisma().candidate.findUnique({
        where: { id: request.params.candidateId },
        select: { id: true, agencyId: true },
      });

      if (!candidate) {
        return reply.code(404).send({
          success: false,
          error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' },
        });
      }

      if (!allowedToAccessCandidate(request.authUser!, candidate.agencyId, candidate.id)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this candidate.' },
        });
      }

      const documents = await getPrisma().candidateDocument.findMany({
        where: { candidateId: candidate.id },
        select: documentSelect,
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, data: documents });
    },
  );

  app.post<{ Params: CandidateParams; Body: DocumentUploadInput }>(
    '/candidates/:candidateId/documents',
    { preHandler: requireAuth },
    async (request, reply) => {
      const candidate = await getPrisma().candidate.findUnique({
        where: { id: request.params.candidateId },
        select: { id: true, agencyId: true, name: true },
      });

      if (!candidate) {
        return reply.code(404).send({
          success: false,
          error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidate not found.' },
        });
      }

      if (!allowedToAccessCandidate(request.authUser!, candidate.agencyId, candidate.id)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have permission to upload documents for this candidate.' },
        });
      }

      const validationErrors = validateDocumentUpload(request.body ?? {});
      if (validationErrors.length) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_DOCUMENT', message: validationErrors.join(' ') },
        });
      }

      const contents = Buffer.from(request.body.contentBase64!.trim(), 'base64');
      if (contents.length === 0) {
        return reply.code(400).send({
          success: false,
          error: { code: 'INVALID_DOCUMENT', message: 'Document content is empty.' },
        });
      }

      if (contents.length > MAX_DOCUMENT_SIZE_BYTES) {
        return reply.code(413).send({
          success: false,
          error: { code: 'DOCUMENT_TOO_LARGE', message: 'Documents must be 5 MB or smaller.' },
        });
      }

      const storageKey = await saveDocument(request.body.fileName!.trim(), contents);

      try {
        const document = await getPrisma().candidateDocument.create({
          data: {
            candidateId: candidate.id,
            originalName: request.body.fileName!.trim(),
            mimeType: request.body.mimeType!.trim().toLowerCase(),
            sizeBytes: contents.length,
            storageKey,
          },
          select: documentSelect,
        });

        await recordAuditEvent({
          actorId: request.authUser!.id,
          agencyId: candidate.agencyId,
          action: 'CANDIDATE_DOCUMENT_UPLOADED',
          entityType: 'CandidateDocument',
          entityId: document.id,
          summary: 'Uploaded "' + document.originalName + '" for candidate "' + candidate.name + '".',
        });

        return reply.code(201).send({ success: true, data: document });
      } catch (error) {
        await deleteDocument(storageKey);
        throw error;
      }
    },
  );

  app.get<{ Params: DocumentParams }>(
    '/candidates/:candidateId/documents/:documentId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const document = await getPrisma().candidateDocument.findFirst({
        where: { id: request.params.documentId, candidateId: request.params.candidateId },
        select: {
          id: true,
          candidateId: true,
          originalName: true,
          mimeType: true,
          storageKey: true,
        },
      });

      if (!document) {
        return reply.code(404).send({
          success: false,
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' },
        });
      }

      const candidate = await getPrisma().candidate.findUnique({
        where: { id: document.candidateId },
        select: { agencyId: true },
      });

      if (!candidate || !allowedToAccessCandidate(request.authUser!, candidate.agencyId, document.candidateId)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this document.' },
        });
      }

      const contents = await readDocument(document.storageKey);
      return reply
        .type(document.mimeType)
        .header(
          'Content-Disposition',
          'attachment; filename="' + sanitizeDownloadName(document.originalName) + '"',
        )
        .send(contents);
    },
  );

  app.delete<{ Params: DocumentParams }>(
    '/candidates/:candidateId/documents/:documentId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const document = await getPrisma().candidateDocument.findFirst({
        where: { id: request.params.documentId, candidateId: request.params.candidateId },
        select: {
          id: true,
          candidateId: true,
          originalName: true,
          storageKey: true,
        },
      });

      if (!document) {
        return reply.code(404).send({
          success: false,
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' },
        });
      }

      const candidate = await getPrisma().candidate.findUnique({
        where: { id: document.candidateId },
        select: { agencyId: true, name: true },
      });

      if (!candidate || !allowedToAccessCandidate(request.authUser!, candidate.agencyId, document.candidateId)) {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this document.' },
        });
      }

      await getPrisma().candidateDocument.delete({ where: { id: document.id } });
      await deleteDocument(document.storageKey);

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: candidate.agencyId,
        action: 'CANDIDATE_DOCUMENT_DELETED',
        entityType: 'CandidateDocument',
        entityId: document.id,
        summary: 'Deleted "' + document.originalName + '" from candidate "' + candidate.name + '".',
      });

      return reply.code(204).send();
    },
  );
};
