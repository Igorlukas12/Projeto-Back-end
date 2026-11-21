/**
 * Tratamento centralizado de erros e rota não encontrada.
 * Todas as respostas de erro seguem o formato { message, details? }.
 */
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const HttpError = require('../utils/HttpError');

function notFound(req, res) {
  res.status(404).json({ message: `Rota ${req.method} ${req.originalUrl} não encontrada` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // JSON malformado enviado pelo cliente
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(400).json({ message: 'Corpo da requisição muito grande' });
  }

  if (err instanceof UniqueConstraintError) {
    const fields = Object.keys(err.fields || {});
    return res.status(400).json({ message: `Valor já cadastrado: ${fields.join(', ')}` });
  }
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(400).json({ message: 'Referência inválida para outro registro' });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ message: 'Dados inválidos', details: err.errors.map((e) => e.message) });
  }

  console.error(err);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}

module.exports = { notFound, errorHandler };
