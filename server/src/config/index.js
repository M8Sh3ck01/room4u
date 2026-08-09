require('dotenv').config({ quiet: true });

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  allowDevLogin: process.env.ALLOW_DEV_LOGIN === 'true',
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/room4u',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtTtl: '1h',
  sessionCookieName: 'room4u_session',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  operatorEmails: (process.env.OPERATOR_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  campus: {
    lat: parseFloat(process.env.CAMPUS_LAT || '-11.4584'),
    lng: parseFloat(process.env.CAMPUS_LNG || '34.0257'),
  },
  amounts: {
    deposit: 10000,
    reporterFee: 3000,
    tenantFee: 20000,
    gatewayFee: 360,
  },
  claimTtlMinutes: parseInt(process.env.CLAIM_TTL_MINUTES || '5', 10),
  paychangu: {
    enabled: process.env.PAYCHANGU_ENABLED === 'true',
    apiUrl: process.env.PAYCHANGU_API_URL || 'https://api.paychangu.com',
    secret: process.env.PAYCHANGU_SECRET || process.env.SECRET_KEY || '',
    webhookSecret: process.env.PAYCHANGU_WEBHOOK_SECRET || '',
  },
};

module.exports = config;
