import { CronExpressionParser } from "cron-parser";
import { validateCron } from "./cron.ts";
export type CronPreview = { times: string[]; limited: boolean };
/** Synchronous engine for the worker and tests only. The UI must use a worker timeout. */
export function previewCron(
  expression: string,
  timezone: string,
  after: string
): CronPreview {
  const validated = validateCron(expression);
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    throw new Error("Choose a valid IANA timezone.");
  }
  const start = new Date(after);
  if (!Number.isFinite(start.getTime()))
    throw new Error("Choose a valid preview start time.");
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 50);
  const monthDays = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    validated.parts[4] === "*" &&
    !validated.values[3].some((month) =>
      validated.values[2].some((day) => day <= monthDays[month])
    )
  ) {
    return { times: [], limited: true };
  }
  const schedule = CronExpressionParser.parse(validated.expression, {
    currentDate: start,
    endDate: end,
    tz: timezone,
  });
  const times: string[] = [];
  for (let i = 0; i < 10; i++) {
    // hasNext catches the library's bounded search/range exhaustion.
    if (!schedule.hasNext()) break;
    times.push(schedule.next().toDate().toISOString());
  }
  return { times, limited: times.length < 10 };
}
