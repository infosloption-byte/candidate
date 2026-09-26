export const jobListWhereForUser = (
  user: { role: 'ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE'; agencyId: string | null; candidateAgencyId: string | null },
) => {
  if (user.role === 'ADMIN' || user.role === 'AGENCY') return undefined;
  if (user.role === 'INTERVIEWEE') {
    return { status: 'PUBLISHED' as const };
  }
  return { id: '__not_found__' };
};