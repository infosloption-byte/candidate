import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { hashPassword, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';

type CompanyStatus = 'ACTIVE' | 'INACTIVE';

interface CompanyBody {
  name?: string;
  slug?: string;
  status?: CompanyStatus;
}

interface CompanyUserBody {
  name?: string;
  email?: string;
  password?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const slugify = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100);

const conflictResponse = (reply: FastifyReply, code: string, message: string) =>
  reply.code(409).send({ success: false, error: { code, message } });

export const companyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/companies', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (_request, reply) => {
    const companies = await getPrisma().company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, jobs: true, candidates: true, interviews: true } },
      },
    });

    return reply.send({
      success: true,
      data: companies.map((company) => ({
        id: company.id,
        name: company.name,
        slug: company.slug,
        status: company.status,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        counts: company._count,
      })),
    });
  });

  app.get<{ Params: { id: string } }>('/companies/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request, reply) => {
    const company = await getPrisma().company.findUnique({
      where: { id: request.params.id },
      include: {
        _count: { select: { users: true, jobs: true, candidates: true, interviews: true } },
      },
    });
    if (!company) {
      return reply.code(404).send({ success: false, error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found.' } });
    }

    return reply.send({ success: true, data: { ...company, counts: company._count } });
  });

  app.post<{ Body: CompanyBody }>('/companies', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request, reply) => {
    const name = request.body.name?.trim();
    const slug = slugify(request.body.slug ?? request.body.name ?? '');

    if (!name || name.length < 2 || name.length > 160 || !slug) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY', message: 'Company name and a valid slug are required.' } });
    }

    try {
      const result = await getPrisma().$transaction(async (tx) => {
        const company = await tx.company.create({ data: { name, slug, status: 'ACTIVE' } });
        const agency = await tx.agency.create({
          data: { companyId: company.id, name, slug: slug + '-agency', status: 'ACTIVE' },
        });
        return { company, agency };
      });

      await recordAuditEvent({
        actorId: request.authUser!.id,
        agencyId: result.agency.id,
        action: 'COMPANY_CREATED',
        entityType: 'Company',
        entityId: result.company.id,
        summary: 'Created company "' + result.company.name + '".',
      });

      return reply.code(201).send({ success: true, data: result.company });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return conflictResponse(reply, 'COMPANY_SLUG_EXISTS', 'Company slug is already in use.');
      }
      throw error;
    }
  });

  app.patch<{ Params: { id: string }; Body: CompanyBody }>('/companies/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request, reply) => {
    const existing = await getPrisma().company.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found.' } });
    }

    const data: { name?: string; slug?: string; status?: CompanyStatus } = {};
    if (request.body.name !== undefined) data.name = request.body.name.trim();
    if (request.body.slug !== undefined) data.slug = slugify(request.body.slug);
    if (request.body.status !== undefined) data.status = request.body.status;

    if (data.name !== undefined && (data.name.length < 2 || data.name.length > 160)) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY', message: 'Company name must be 2-160 characters.' } });
    }
    if (data.slug !== undefined && !data.slug) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY', message: 'Company slug cannot be empty.' } });
    }
    if (data.status !== undefined && !['ACTIVE', 'INACTIVE'].includes(data.status)) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY_STATUS', message: 'Company status must be ACTIVE or INACTIVE.' } });
    }

    try {
      const company = await getPrisma().company.update({ where: { id: request.params.id }, data });
      await recordAuditEvent({
        actorId: request.authUser!.id,
        companyId: company.id,
        agencyId: null,
        action: 'COMPANY_UPDATED',
        entityType: 'Company',
        entityId: company.id,
        summary: 'Updated company "' + company.name + '".',
      } as never);
      return reply.send({ success: true, data: company });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return conflictResponse(reply, 'COMPANY_SLUG_EXISTS', 'Company slug is already in use.');
      }
      throw error;
    }
  });
};
