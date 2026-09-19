export const jobListWhereForUser = (
  user: { role: 'ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE'; agencyId: string | null; candidateAgencyId: string | null },
) => {
  if (user.role === 'ADMIN') return undefined;
  if (user.role === 'INTERVIEWEE') {
    return {
      status: 'PUBLISHED' as const,
      agencyId: user.candidateAgencyId ?? '__missing__',
    };
  }

  return { agencyId: user.agencyId ?? '__missing__' };
};
