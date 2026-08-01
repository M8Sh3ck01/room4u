require('dotenv').config({ quiet: true });

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  allowDevLogin: process.env.ALLOW_DEV_LOGIN === 'true',
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/room4u',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtTtl: '1h',
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
};

module.exports = config;
