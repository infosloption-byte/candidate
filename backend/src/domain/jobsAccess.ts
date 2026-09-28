export const jobListWhereForUser = (
  user: { role: 'COMPANY' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE'; companyId: string | null; agencyId: string | null; candidateAgencyId: string | null },
) => {
  if (user.role === 'COMPANY' || user.role === 'AGENCY') {
    return { companyId: user.companyId ?? '__missing__' };
  }
  if (user.role === 'INTERVIEWEE') {
    return { status: 'PUBLISHED' as const };
  }
  return { id: '__not_found__' };
};
