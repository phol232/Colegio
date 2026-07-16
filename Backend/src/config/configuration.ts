export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  appName: process.env.APP_NAME ?? 'Academic Management API',
  appVersion: process.env.APP_VERSION ?? '1.0.0',
  oltp: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },
  olap: {
    host: process.env.DB_OLAP_HOST ?? process.env.DB_HOST,
    port: parseInt(process.env.DB_OLAP_PORT ?? process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_OLAP_DATABASE,
    user: process.env.DB_OLAP_USERNAME ?? process.env.DB_USERNAME,
    password: process.env.DB_OLAP_PASSWORD ?? process.env.DB_PASSWORD,
  },
  redisCache: {
    host: process.env.REDIS_CACHE_HOST,
    port: parseInt(process.env.REDIS_CACHE_PORT ?? '6379', 10),
    db: parseInt(process.env.REDIS_CACHE_DB ?? '0', 10),
  },
  redisQueue: {
    host: process.env.REDIS_QUEUE_HOST,
    port: parseInt(process.env.REDIS_QUEUE_PORT ?? '6379', 10),
    db: parseInt(process.env.REDIS_QUEUE_DB ?? '0', 10),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '200', 10),
    apiLimit: parseInt(process.env.THROTTLE_API_LIMIT ?? '500', 10),
  },
  authTokenCacheTtl: parseInt(process.env.AUTH_TOKEN_CACHE_TTL ?? '60', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
});
