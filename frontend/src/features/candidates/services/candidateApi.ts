import type { Candidate } from "../types/candidate";
import { apiRequest } from "../../../shared/services/apiClient";

export interface CandidateListResponse {
  items: Candidate[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CandidateCreateRequest {
  name: string;
  phone: string;
  passportNumber?: string;
  age?: number;
  location?: string;
  profession: string;
  originalProfession?: string;
  experienceYears: number;
  secondarySkills?: string[];
  overseasCountries?: string[];
  englishLevel: Candidate["englishLevel"];
  locationReady?: boolean;
  drivingLicense?: boolean;
  availability: Candidate["availability"];
  source: Candidate["source"];
  tags?: string[];
  nationality?: string;
  dateOfBirth?: string;
  passportExpiry?: string;
  visaStatus?: Candidate["visaStatus"];
  preferredDestinationCountries?: string[];
  expectedSalary?: string;
  salaryCurrency?: string;
  noticePeriod?: string;
  yearsInCurrentTrade?: number;
  tradeCertificateDetails?: string;
  drivingLicenseCategories?: string[];
  preferredInterviewLanguage?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  recruiterOwnerId?: string;
  priority?: Candidate["priority"];
  sourceCampaign?: string;
  duplicateOverride?: boolean;
}

export const fetchCandidates = async (): Promise<Candidate[]> => {
  const response = await apiRequest<CandidateListResponse>("/candidates?page=1&pageSize=100");
  return response.items;
};

export const createCandidateApi = async (candidate: Candidate, duplicateOverride = false): Promise<Candidate> =>
  apiRequest<Candidate>("/candidates", {
    method: "POST",
    body: JSON.stringify({
      name: candidate.name,
      phone: candidate.phone,
      passportNumber: candidate.passportNumber === "Not provided" ? undefined : candidate.passportNumber,
      age: candidate.age || undefined,
      location: candidate.location,
      profession: candidate.profession,
      originalProfession: candidate.originalProfession,
      experienceYears: candidate.experienceYears,
      secondarySkills: candidate.secondarySkills,
      overseasCountries: candidate.overseasCountries,
      englishLevel: candidate.englishLevel,
      locationReady: candidate.locationReady,
      drivingLicense: candidate.drivingLicense,
      availability: candidate.availability,
      source: candidate.source,
      duplicateOverride,
      priority: candidate.priority,
      sourceCampaign: candidate.sourceCampaign,
    } satisfies CandidateCreateRequest),
  });

export const updateCandidateApi = async (candidateId: string, changes: Partial<Candidate>): Promise<Candidate> =>
  apiRequest<Candidate>(`/candidates/${encodeURIComponent(candidateId)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });

export const updateCandidateStatusApi = async (
  candidateId: string,
  status: Candidate["status"],
  reason?: string,
  note?: string,
): Promise<Candidate> =>
  apiRequest<Candidate>(`/candidates/${encodeURIComponent(candidateId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status, reason, note }),
  });