interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const readParts = (date: Date, timeZone: string): DateTimeParts => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
};

export const localDateTimeToUtc = (date: string, time: string, timeZone: string): Date => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!match || !timeMatch) throw new Error("Invalid local date/time.");

  const [year, month, day] = match.slice(1).map(Number);
  const [hour, minute] = timeMatch.slice(1).map(Number);
  const baseUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const localAtBase = readParts(baseUtc, timeZone);
  const interpretedLocalUtc = Date.UTC(
    localAtBase.year,
    localAtBase.month - 1,
    localAtBase.day,
    localAtBase.hour,
    localAtBase.minute,
  );
  return new Date(baseUtc.getTime() - (interpretedLocalUtc - baseUtc.getTime()));
};

export const formatLocalDate = (utcDate: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).formatToParts(utcDate);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
};

export const formatLocalTime = (utcDate: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcDate);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")}`;
};