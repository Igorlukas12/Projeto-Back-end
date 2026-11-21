/**
 * Armazenamento das imagens de produto em disco.
 * Recebe o conteúdo em base64 e salva em UPLOAD_DIR/products/<productId>/<uuid>.<ext>.
 * No banco fica apenas o caminho relativo (ex.: "products/1/abc.png").
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { uploadDir } = require('../config/env');
const HttpError = require('../utils/HttpError');

const EXTENSIONS = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

/** Remove um eventual prefixo "data:image/png;base64," e valida o conteúdo. */
function decodeBase64(content) {
  if (typeof content !== 'string') throw HttpError.badRequest('O conteúdo da imagem deve ser base64');
  const raw = content.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
  if (!raw || raw.length % 4 !== 0 || !BASE64_REGEX.test(raw)) {
    throw HttpError.badRequest('O conteúdo da imagem não é um base64 válido');
  }
  return Buffer.from(raw, 'base64');
}

/** Indica se "content" parece base64 (e não uma URL de imagem já existente). */
function isBase64(content) {
  return typeof content === 'string' && !/^https?:\/\//i.test(content) && !content.startsWith('/');
}

async function save(productId, type, content) {
  const ext = EXTENSIONS[type];
  if (!ext) {
    throw HttpError.badRequest(`Tipo de imagem não suportado: ${type}`, { allowed: Object.keys(EXTENSIONS) });
  }
  const buffer = decodeBase64(content);

  const relative = path.posix.join('products', String(productId), `${crypto.randomUUID()}.${ext}`);
  const absolute = path.join(uploadDir, relative);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return relative;
}

/** Remove o arquivo; ignora erros (ex.: arquivo já removido). */
async function remove(relative) {
  try {
    await fs.unlink(path.join(uploadDir, relative));
  } catch {
    /* arquivo inexistente: nada a fazer */
  }
}

/** Monta a URL pública absoluta da imagem. */
function publicUrl(baseUrl, relative) {
  return `${baseUrl.replace(/\/$/, '')}/media/${relative}`;
}

module.exports = { save, remove, isBase64, publicUrl, EXTENSIONS };
