/**
 * Normalise a calendar day for Prisma `@db.Date` fields.
 * Uses local year/month/day but stores at UTC midnight so PostgreSQL keeps
 * the intended date (avoids off-by-one in UTC+ timezones).
 */
export const toDateOnly = (input: Date = new Date()): Date =>
  new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));

export const todayDateOnly = (): Date => toDateOnly(new Date());

/** Parse `YYYY-MM-DD` without `Date.parse` UTC shifting. */
export const parseDateOnly = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) throw new Error('INVALID_DATE');
    return toDateOnly(fallback);
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
};
