const { appUrl } = require('../config/env');

/** URL base pública da API (APP_URL ou derivada da requisição). */
module.exports = (req) => appUrl || `${req.protocol}://${req.get('host')}`;
