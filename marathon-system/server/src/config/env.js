import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/marathon'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  smsProvider: process.env.SMS_PROVIDER || 'mock',
  mailProvider: process.env.MAIL_PROVIDER || 'mock',
  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  seedAdmin: {
    phone: process.env.SEED_ADMIN_PHONE || '13800000000',
    email: process.env.SEED_ADMIN_EMAIL || 'admin@marathon.local',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin123456',
  },
};
