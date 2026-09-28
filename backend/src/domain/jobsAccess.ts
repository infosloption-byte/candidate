export const jobListWhereForUser = (
  user: { role: 'ADMIN' | 'COMPANY_ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE'; companyId: string | null; agencyId: string | null; candidateAgencyId: string | null },
) => {
  if (user.role === 'ADMIN') return undefined;
  if (user.role === 'COMPANY_ADMIN' || user.role === 'AGENCY') {
    return { companyId: user.companyId ?? '__missing__' };
  }
  if (user.role === 'INTERVIEWEE') {
    return { status: 'PUBLISHED' as const };
  }
  return { id: '__not_found__' };
};
