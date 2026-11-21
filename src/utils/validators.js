/**
 * Funções puras de validação/parse reutilizadas pelos services.
 * Todas lançam HttpError 400 quando o valor é inválido.
 */
const HttpError = require('./HttpError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Garante que o corpo da requisição é um objeto JSON. */
function ensureBody(body) {
  if (!isPlainObject(body)) throw HttpError.badRequest('O corpo da requisição deve ser um objeto JSON');
  return body;
}

/** String não vazia (após trim). */
function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw HttpError.badRequest(`O campo "${field}" é obrigatório e deve ser um texto`);
  }
  return value.trim();
}

function optionalString(value, field) {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string') throw HttpError.badRequest(`O campo "${field}" deve ser um texto`);
  return value;
}

function requireEmail(value, field = 'email') {
  const email = requireString(value, field).toLowerCase();
  if (!EMAIL_REGEX.test(email)) throw HttpError.badRequest(`O campo "${field}" deve ser um e-mail válido`);
  return email;
}

function optionalBoolean(value, field) {
  if (value === undefined) return undefined;
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return Boolean(value);
  throw HttpError.badRequest(`O campo "${field}" deve ser booleano`);
}

function requireNumber(value, field, { min } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw HttpError.badRequest(`O campo "${field}" é obrigatório e deve ser numérico`);
  }
  if (min !== undefined && value < min) throw HttpError.badRequest(`O campo "${field}" deve ser >= ${min}`);
  return value;
}

function optionalInteger(value, field, { min } = {}) {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value)) throw HttpError.badRequest(`O campo "${field}" deve ser um número inteiro`);
  if (min !== undefined && value < min) throw HttpError.badRequest(`O campo "${field}" deve ser >= ${min}`);
  return value;
}

/** Converte o parâmetro :id da rota. IDs inválidos são tratados como "não encontrado". */
function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw HttpError.notFound();
  return id;
}

/** Converte "1,2,3" em [1,2,3], rejeitando valores não inteiros. */
function parseIntList(value, field) {
  const parts = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = parts.map(Number);
  if (ids.length === 0 || ids.some((n) => !Number.isInteger(n) || n < 1)) {
    throw HttpError.badRequest(`O parâmetro "${field}" deve ser uma lista de IDs separados por vírgula`);
  }
  return [...new Set(ids)];
}

/**
 * Lê os parâmetros de paginação (limit/page).
 * limit padrão = 12, limit = -1 retorna todos os itens; page padrão = 1.
 */
function parsePagination(query) {
  const limit = query.limit === undefined ? 12 : Number(query.limit);
  if (!Number.isInteger(limit) || (limit < 1 && limit !== -1)) {
    throw HttpError.badRequest('O parâmetro "limit" deve ser um inteiro positivo ou -1');
  }
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isInteger(page) || page < 1) {
    throw HttpError.badRequest('O parâmetro "page" deve ser um inteiro maior ou igual a 1');
  }
  const sql = limit === -1 ? {} : { limit, offset: (page - 1) * limit };
  return { limit, page, sql };
}

/** Lê o parâmetro "fields" ("name,slug") validando contra a lista permitida. */
function parseFields(value, allowed) {
  if (value === undefined || value === '') return null;
  const fields = [...new Set(String(value).split(',').map((s) => s.trim()).filter(Boolean))];
  const invalid = fields.filter((f) => !allowed.includes(f));
  if (fields.length === 0 || invalid.length) {
    throw HttpError.badRequest(`Campos inválidos em "fields": ${invalid.join(', ')}`, { allowed });
  }
  return fields;
}

/** Converte "true"/"false" de query string em booleano. */
function parseBooleanQuery(value, field) {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw HttpError.badRequest(`O parâmetro "${field}" deve ser true ou false`);
}

/** Converte "100-200" em { min: 100, max: 200 }. */
function parsePriceRange(value) {
  if (value === undefined) return undefined;
  const match = String(value).match(/^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*$/);
  if (!match) throw HttpError.badRequest('O parâmetro "price-range" deve estar no formato min-max (ex.: 100-200)');
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (min > max) throw HttpError.badRequest('No "price-range" o valor mínimo deve ser menor ou igual ao máximo');
  return { min, max };
}

module.exports = {
  isPlainObject,
  ensureBody,
  requireString,
  optionalString,
  requireEmail,
  optionalBoolean,
  requireNumber,
  optionalInteger,
  parseId,
  parseIntList,
  parsePagination,
  parseFields,
  parseBooleanQuery,
  parsePriceRange,
};
