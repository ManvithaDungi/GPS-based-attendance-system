import crypto from 'crypto';

type QueryValue = string | string[] | undefined;
type QueryRecord = Record<string, QueryValue>;

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

const normalizeQuery = (query: QueryRecord): Record<string, unknown> => {
  return Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const value = query[key];
      acc[key] = stableValue(value ?? null);
      return acc;
    }, {});
};

export const buildIdempotencyFingerprint = (
  method: string,
  path: string,
  query: QueryRecord,
  body: unknown
): string => {
  const fingerprintSource = {
    method: method.toUpperCase(),
    path,
    query: normalizeQuery(query),
    body: stableValue(body),
  };

  return crypto.createHash('sha256').update(JSON.stringify(fingerprintSource)).digest('hex');
};
