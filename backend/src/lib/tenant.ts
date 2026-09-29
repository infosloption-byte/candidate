import type { AuthUser } from './auth.js';

type Scoped = Pick<AuthUser, 'companyId' | 'agencyId' | 'role'>;

/** True only when the user belongs to (or is acting inside) exactly this company. */
export const inCompany = (user: Pick<AuthUser, 'companyId'>, companyId: string | null | undefined): boolean =>
  Boolean(user.companyId) && user.companyId === companyId;

/**
 * Company administrators manage everything in their company; agency users manage only their own
 * agency. Every other role (and any platform admin who is not acting inside a company) gets false.
 */
export const canManageInAgency = (user: Scoped, resource: { companyId: string; agencyId: string }): boolean =>
  inCompany(user, resource.companyId)
  && (user.role === 'COMPANY_ADMIN' || (user.role === 'AGENCY' && user.agencyId === resource.agencyId));

/** Company-wide managers only (company admin, incl. a platform admin acting inside the company). */
export const isCompanyManager = (user: Scoped, companyId: string | null | undefined): boolean =>
  user.role === 'COMPANY_ADMIN' && inCompany(user, companyId);
