import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { hashPassword, requireAuth, requireRole } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
import { recordAuditEvent } from '../lib/audit.js';

type CompanyStatus = 'ACTIVE' | 'INACTIVE';

interface CompanyBody {
  name?: string;
  slug?: string;
  status?: CompanyStatus;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}

interface CompanyUserBody {
  name?: string;
  email?: string;
  password?: string;
}

const slugify = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100);

const conflictResponse = (reply: FastifyReply, code: string, message: string) =>
  reply.code(409).send({ success: false, error: { code, message } });

export const companyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/companies', { preHandler: [requireAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] }, async (request, reply) => {
    const companies = await getPrisma().company.findMany({
      where: request.authUser!.role === 'ADMIN' ? undefined : { id: request.authUser!.companyId ?? '__missing__' },
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

  app.get<{ Params: { id: string } }>('/companies/:id', { preHandler: [requireAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] }, async (request, reply) => {
    if (request.authUser!.role !== 'ADMIN' && request.params.id !== request.authUser!.companyId) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own company.' } });
    }
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
    const adminName = request.body.adminName?.trim();
    const adminEmail = request.body.adminEmail?.trim().toLowerCase();
    const adminPassword = request.body.adminPassword ?? '';

    if (!name || name.length < 2 || name.length > 160 || !slug) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY', message: 'Company name and a valid slug are required.' } });
    }
    if (!adminName || adminName.length < 2 || adminName.length > 160 || !adminEmail || !adminEmail.includes('@') || adminEmail.length > 191 || adminPassword.length < 8 || adminPassword.length > 128) {
      return reply.code(400).send({ success: false, error: { code: 'INVALID_COMPANY_ADMIN', message: 'Company administrator name, valid email, and password (8-128 characters) are required.' } });
    }

    try {
      const result = await getPrisma().$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { name, slug, status: 'ACTIVE' },
        });
        const admin = await tx.user.create({
          data: {
            companyId: company.id,
            agencyId: null,
            name: adminName,
            email: adminEmail,
            passwordHash: await hashPassword(adminPassword),
            role: 'COMPANY_ADMIN',
            active: true,
          },
        });
        return { company, admin };
      });
      const company = result.company;

      await recordAuditEvent({
        actorId: request.authUser!.id,
        companyId: company.id,
        agencyId: null,
        action: 'COMPANY_CREATED',
        entityType: 'Company',
        entityId: company.id,
        summary: 'Created company "' + company.name + '".',
      });

      return reply.code(201).send({ success: true, data: company });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return conflictResponse(reply, 'COMPANY_EXISTS', 'Company slug or administrator email is already in use.');
      }
      throw error;
    }
  });

  app.patch<{ Params: { id: string }; Body: CompanyBody }>('/companies/:id', { preHandler: [requireAuth, requireRole('ADMIN', 'COMPANY_ADMIN')] }, async (request, reply) => {
    if (request.authUser!.role !== 'ADMIN' && request.params.id !== request.authUser!.companyId) {
      return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'You can only manage your own company.' } });
    }
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
      });
      return reply.send({ success: true, data: company });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return conflictResponse(reply, 'COMPANY_SLUG_EXISTS', 'Company slug is already in use.');
      }
      throw error;
    }
  });
};
