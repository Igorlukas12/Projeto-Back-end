/**
 * Middleware de autenticação JWT.
 * Espera o header "Authorization: Bearer <token>" e injeta o usuário em req.user.
 */
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { User } = require('../models');
const HttpError = require('../utils/HttpError');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw HttpError.unauthorized('Token de autenticação não informado');
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw HttpError.unauthorized('Token inválido ou expirado');
  }

  // Garante que o usuário do token ainda existe (ex.: não foi removido)
  const user = await User.findByPk(payload.sub);
  if (!user) throw HttpError.unauthorized('Usuário do token não existe mais');

  req.user = user;
  next();
}

module.exports = authenticate;
