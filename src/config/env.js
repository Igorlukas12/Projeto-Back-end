/**
 * Variáveis de ambiente da aplicação, com valores padrão.
 */
require('dotenv').config();
const path = require('path');

module.exports = {
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || null,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
};
