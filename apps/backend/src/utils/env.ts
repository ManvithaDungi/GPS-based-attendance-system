const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
};

const jwtSecret = requireEnv('JWT_SECRET');
const refreshSecret = requireEnv('REFRESH_SECRET');

export const getJwtSecret = (): string => jwtSecret;

export const getRefreshSecret = (): string => refreshSecret;
