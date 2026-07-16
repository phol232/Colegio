export function validateEnv(config: Record<string, unknown>) {
  const required = [
    'DB_HOST',
    'DB_PASSWORD',
    'REDIS_CACHE_HOST',
    'REDIS_QUEUE_HOST',
    'PORT',
  ] as const;

  const missing = required.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const port = Number(config.PORT);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PORT must be a positive number');
  }

  return config;
}
