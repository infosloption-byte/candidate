export interface InterviewTimezoneInfo {
  timeZone: string;
  offset: string;
  label: string;
}

const getLocalDateTime = (isoDate: string, time: string): Date => {
  const candidate = new Date(`${isoDate}T${time || '00:00'}:00`);
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
};

export const getInterviewTimezoneInfo = (isoDate: string, time: string): InterviewTimezoneInfo => {
  const date = getLocalDateTime(isoDate, time);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local timezone';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    timeZoneName: 'longOffset',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const offset = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'local offset';
  return { timeZone, offset, label: `${timeZone} · ${offset}` };
};

export const formatTimezoneTime = (date: Date): string => date.toLocaleTimeString('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});