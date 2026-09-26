export interface CandidateNameParts {
  firstName: string;
  lastName: string;
}

export const getCandidateDisplayName = ({ firstName, lastName }: CandidateNameParts): string =>
  [firstName, lastName].map((value) => value.trim()).filter(Boolean).join(' ');

export const withCandidateDisplayName = <T extends CandidateNameParts>(candidate: T): T & { name: string } => ({
  ...candidate,
  name: getCandidateDisplayName(candidate),
  skills: [],
});
