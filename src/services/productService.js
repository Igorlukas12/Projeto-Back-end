/**
 * Regras de negócio de produtos (incluindo imagens, opções e categorias).
 */
const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  Category,
  ProductImage,
  ProductOption,
  ProductCategory,
} = require('../models');
const storage = require('./imageStorage');
const HttpError = require('../utils/HttpError');
const v = require('../utils/validators');

const SCALAR_FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'use_in_menu',
  'stock',
  'description',
  'price',
  'price_with_discount',
];
const RELATION_FIELDS = ['category_ids', 'images', 'options'];
const PUBLIC_FIELDS = [...SCALAR_FIELDS, ...RELATION_FIELDS];

const OPTION_SHAPES = ['square', 'circle'];
const OPTION_TYPES = ['text', 'color'];

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

const splitValues = (values) => (values ? values.split(',') : []);

function formatOption(o) {
  return {
    id: o.id,
    title: o.title,
    shape: o.shape,
    radius: o.radius,
    type: o.type,
    values: splitValues(o.values),
  };
}

/** Converte o model no formato da API, mantendo apenas os campos pedidos. */
function formatProduct(product, baseUrl, fields = PUBLIC_FIELDS) {
  const p = product.get({ plain: true });
  const full = {};
  SCALAR_FIELDS.forEach((f) => {
    if (p[f] !== undefined) full[f] = p[f];
  });
  if (p.categories) full.category_ids = p.categories.map((c) => c.id);
  if (p.images) {
    full.images = p.images.map((img) => ({ id: img.id, content: storage.publicUrl(baseUrl, img.path) }));
  }
  if (p.options) full.options = p.options.map(formatOption);

  return Object.fromEntries(fields.filter((f) => f in full).map((f) => [f, full[f]]));
}

/** Monta os includes necessários conforme os campos solicitados. */
function buildIncludes(fields) {
  const include = [];
  if (fields.includes('category_ids')) {
    include.push({ model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } });
  }
  // "separate" executa uma consulta por relação, evitando produto cartesiano e problemas com LIMIT
  if (fields.includes('images')) {
    include.push({ model: ProductImage, as: 'images', separate: true, order: [['id', 'ASC']] });
  }
  if (fields.includes('options')) {
    include.push({ model: ProductOption, as: 'options', separate: true, order: [['id', 'ASC']] });
  }
  return include;
}

/* ------------------------------------------------------------------ */
/* Validação dos payloads                                              */
/* ------------------------------------------------------------------ */

/** Converte radius ("4px", "4" ou 4) em inteiro. */
function parseRadius(value) {
  if (value === undefined) return undefined;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isInteger(n) || n < 0) throw HttpError.badRequest('O campo "radius" da opção deve ser um inteiro >= 0 (ex.: 4 ou "4px")');
  return n;
}

/** Converte values (array ou "P,M,G") em string separada por vírgulas. Aceita também "value". */
function parseOptionValues(value) {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : String(value).split(',');
  const clean = list.map((item) => String(item).trim()).filter(Boolean);
  if (clean.length === 0) throw HttpError.badRequest('O campo "values" da opção deve conter ao menos um valor');
  return clean.join(',');
}

/** Valida uma opção. Com partial=true, apenas os campos enviados são validados. */
function parseOption(raw, partial = false) {
  if (!v.isPlainObject(raw)) throw HttpError.badRequest('Cada opção deve ser um objeto');
  const data = {};

  if (raw.title !== undefined || !partial) data.title = v.requireString(raw.title, 'options.title');
  if (raw.shape !== undefined) {
    if (!OPTION_SHAPES.includes(raw.shape)) throw HttpError.badRequest(`"shape" deve ser: ${OPTION_SHAPES.join(', ')}`);
    data.shape = raw.shape;
  }
  if (raw.type !== undefined) {
    if (!OPTION_TYPES.includes(raw.type)) throw HttpError.badRequest(`"type" deve ser: ${OPTION_TYPES.join(', ')}`);
    data.type = raw.type;
  }
  const radius = parseRadius(raw.radius);
  if (radius !== undefined) data.radius = radius;

  const values = parseOptionValues(raw.values ?? raw.value);
  if (values !== undefined) data.values = values;
  else if (!partial) throw HttpError.badRequest('O campo "values" da opção é obrigatório');

  return data;
}

function parseArray(value, field) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw HttpError.badRequest(`O campo "${field}" deve ser uma lista`);
  return value;
}

/** Valida os campos simples do produto. Com partial=true (PUT) todos são opcionais. */
function parseProductFields(body, partial) {
  const data = {};
  const has = (f) => body[f] !== undefined;

  if (has('name') || !partial) data.name = v.requireString(body.name, 'name');
  if (has('slug') || !partial) data.slug = v.requireString(body.slug, 'slug');
  if (has('price') || !partial) data.price = v.requireNumber(body.price, 'price', { min: 0 });
  if (has('price_with_discount') || !partial) {
    data.price_with_discount = v.requireNumber(body.price_with_discount, 'price_with_discount', { min: 0 });
  }
  if (has('enabled')) data.enabled = v.optionalBoolean(body.enabled, 'enabled');
  if (has('use_in_menu')) data.use_in_menu = v.optionalBoolean(body.use_in_menu, 'use_in_menu');
  if (has('stock')) data.stock = v.optionalInteger(body.stock, 'stock', { min: 0 });
  if (has('description')) data.description = v.optionalString(body.description, 'description');

  return data;
}

async function ensureSlugIsFree(slug, ignoreId, transaction) {
  const where = { slug };
  if (ignoreId) where.id = { [Op.ne]: ignoreId };
  if (await Product.count({ where, transaction })) throw HttpError.badRequest('Slug já cadastrado');
}

/** Valida que todas as categorias existem e devolve os IDs únicos. */
async function parseCategoryIds(value, transaction) {
  const list = parseArray(value, 'category_ids');
  if (list === undefined) return undefined;
  if (list.some((id) => !Number.isInteger(id) || id < 1)) {
    throw HttpError.badRequest('"category_ids" deve conter apenas IDs inteiros');
  }
  const ids = [...new Set(list)];
  if (ids.length) {
    const found = await Category.count({ where: { id: ids }, transaction });
    if (found !== ids.length) throw HttpError.badRequest('Uma ou mais categorias informadas não existem');
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

/** Extrai os filtros option[ID]=A,B da query (com ou sem parser "extended"). */
function parseOptionFilters(query) {
  const filters = [];
  const push = (id, value) => {
    const optionId = Number(id);
    const values = String(value).split(',').map((s) => s.trim()).filter(Boolean);
    if (!Number.isInteger(optionId) || values.length === 0) {
      throw HttpError.badRequest('Filtro de opção inválido. Use option[ID]=VALOR1,VALOR2');
    }
    filters.push({ optionId, values });
  };

  Object.entries(query).forEach(([key, value]) => {
    const match = key.match(/^option\[(\d+)\]$/);
    if (match) push(match[1], value);
  });
  if (v.isPlainObject(query.option)) {
    Object.entries(query.option).forEach(([id, value]) => push(id, value));
  }
  return filters;
}

/** Condição que verifica se um valor está na lista "A,B,C" da coluna values. */
function valueInListCondition(value) {
  return [
    { values: value },
    { values: { [Op.like]: `${value},%` } },
    { values: { [Op.like]: `%,${value}` } },
    { values: { [Op.like]: `%,${value},%` } },
  ];
}

/** Interseção de conjuntos de IDs (null = sem restrição). */
const intersect = (current, ids) => (current === null ? ids : current.filter((id) => ids.includes(id)));

async function search(query, baseUrl) {
  const { limit, page, sql } = v.parsePagination(query);
  const fields = v.parseFields(query.fields, PUBLIC_FIELDS) || PUBLIC_FIELDS;
  const priceRange = v.parsePriceRange(query['price-range']);
  const categoryIds = query.category_ids !== undefined ? v.parseIntList(query.category_ids, 'category_ids') : null;
  const optionFilters = parseOptionFilters(query);

  const where = {};

  if (query.match !== undefined && String(query.match).trim() !== '') {
    const term = `%${String(query.match).trim()}%`;
    where[Op.or] = [{ name: { [Op.like]: term } }, { description: { [Op.like]: term } }];
  }
  if (priceRange) where.price = { [Op.between]: [priceRange.min, priceRange.max] };

  // Filtros por relação viram uma lista restrita de IDs de produto
  let allowedIds = null;
  if (categoryIds) {
    const rows = await ProductCategory.findAll({
      where: { category_id: categoryIds },
      attributes: ['product_id'],
      raw: true,
    });
    allowedIds = intersect(allowedIds, [...new Set(rows.map((r) => r.product_id))]);
  }
  for (const { optionId, values } of optionFilters) {
    const rows = await ProductOption.findAll({
      where: { id: optionId, [Op.or]: values.flatMap(valueInListCondition) },
      attributes: ['product_id'],
      raw: true,
    });
    allowedIds = intersect(allowedIds, rows.map((r) => r.product_id));
  }
  if (allowedIds !== null) where.id = { [Op.in]: allowedIds };

  // "id" é sempre carregado pois é necessário para montar as relações
  const attributes = [...new Set(['id', ...fields.filter((f) => SCALAR_FIELDS.includes(f))])];

  const [total, rows] = await Promise.all([
    Product.count({ where }),
    Product.findAll({
      where,
      attributes,
      include: buildIncludes(fields),
      order: [['id', 'ASC']],
      ...sql,
    }),
  ]);

  return { data: rows.map((p) => formatProduct(p, baseUrl, fields)), total, limit, page };
}

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

async function findById(id, options = {}) {
  const product = await Product.findByPk(id, options);
  if (!product) throw HttpError.notFound('Produto não encontrado');
  return product;
}

async function getById(id, baseUrl) {
  const product = await findById(id, { include: buildIncludes(RELATION_FIELDS) });
  return formatProduct(product, baseUrl);
}

/** Salva uma nova imagem (base64) e registra o arquivo para rollback em caso de erro. */
async function addImage(productId, raw, ctx) {
  if (!v.isPlainObject(raw)) throw HttpError.badRequest('Cada imagem deve ser um objeto');
  v.requireString(raw.type, 'images.type');
  v.requireString(raw.content, 'images.content');
  const relative = await storage.save(productId, raw.type, raw.content);
  ctx.created.push(relative);
  await ProductImage.create(
    { product_id: productId, path: relative, enabled: v.optionalBoolean(raw.enabled, 'images.enabled') ?? true },
    { transaction: ctx.transaction },
  );
}

/**
 * Executa "work" em uma transação. Se falhar, remove os arquivos criados;
 * se der certo, remove os arquivos de imagens excluídas/substituídas.
 */
async function withTransaction(work) {
  const ctx = { created: [], toDelete: [] };
  try {
    const result = await sequelize.transaction(async (transaction) => {
      ctx.transaction = transaction;
      return work(ctx);
    });
    await Promise.all(ctx.toDelete.map(storage.remove));
    return result;
  } catch (err) {
    await Promise.all(ctx.created.map(storage.remove));
    throw err;
  }
}

async function create(body, baseUrl) {
  v.ensureBody(body);
  const data = parseProductFields(body, false);
  const images = parseArray(body.images, 'images') || [];
  const options = (parseArray(body.options, 'options') || []).map((o) => parseOption(o));

  const productId = await withTransaction(async (ctx) => {
    const { transaction } = ctx;
    await ensureSlugIsFree(data.slug, null, transaction);
    const categoryIds = (await parseCategoryIds(body.category_ids, transaction)) || [];

    const product = await Product.create(data, { transaction });
    if (categoryIds.length) await product.setCategories(categoryIds, { transaction });
    for (const image of images) await addImage(product.id, image, ctx);
    if (options.length) {
      await ProductOption.bulkCreate(
        options.map((o) => ({ ...o, product_id: product.id })),
        { transaction },
      );
    }
    return product.id;
  });

  return getById(productId, baseUrl);
}

/** Aplica as alterações de imagens do PUT: novas, removidas ou substituídas. */
async function syncImages(product, images, ctx) {
  const { transaction } = ctx;
  for (const raw of images) {
    if (!v.isPlainObject(raw)) throw HttpError.badRequest('Cada imagem deve ser um objeto');

    if (raw.id === undefined) {
      await addImage(product.id, raw, ctx);
      continue;
    }

    const image = await ProductImage.findOne({ where: { id: raw.id, product_id: product.id }, transaction });
    if (!image) throw HttpError.badRequest(`Imagem ${raw.id} não pertence a este produto`);

    if (raw.deleted === true) {
      await image.destroy({ transaction });
      ctx.toDelete.push(image.path);
      continue;
    }

    const changes = {};
    if (raw.enabled !== undefined) changes.enabled = v.optionalBoolean(raw.enabled, 'images.enabled');
    // content em base64 substitui o arquivo; uma URL significa "manter a imagem atual"
    if (raw.content !== undefined && storage.isBase64(raw.content)) {
      v.requireString(raw.type, 'images.type');
      changes.path = await storage.save(product.id, raw.type, raw.content);
      ctx.created.push(changes.path);
      ctx.toDelete.push(image.path);
    }
    if (Object.keys(changes).length) await image.update(changes, { transaction });
  }
}

/** Aplica as alterações de opções do PUT: novas, removidas ou atualizadas. */
async function syncOptions(product, options, transaction) {
  for (const raw of options) {
    if (!v.isPlainObject(raw)) throw HttpError.badRequest('Cada opção deve ser um objeto');

    if (raw.id === undefined) {
      await ProductOption.create({ ...parseOption(raw), product_id: product.id }, { transaction });
      continue;
    }

    const option = await ProductOption.findOne({ where: { id: raw.id, product_id: product.id }, transaction });
    if (!option) throw HttpError.badRequest(`Opção ${raw.id} não pertence a este produto`);

    if (raw.deleted === true) {
      await option.destroy({ transaction });
    } else {
      const { id, deleted, ...rest } = raw; // eslint-disable-line no-unused-vars
      await option.update(parseOption(rest, true), { transaction });
    }
  }
}

async function update(id, body) {
  v.ensureBody(body);
  const data = parseProductFields(body, true);
  const images = parseArray(body.images, 'images');
  const options = parseArray(body.options, 'options');

  await withTransaction(async (ctx) => {
    const { transaction } = ctx;
    const product = await findById(id, { transaction });

    if (data.slug !== undefined) await ensureSlugIsFree(data.slug, id, transaction);
    const categoryIds = await parseCategoryIds(body.category_ids, transaction);

    if (Object.keys(data).length) await product.update(data, { transaction });
    if (categoryIds !== undefined) await product.setCategories(categoryIds, { transaction });
    if (images) await syncImages(product, images, ctx);
    if (options) await syncOptions(product, options, transaction);
  });
}

async function remove(id) {
  await withTransaction(async (ctx) => {
    const product = await findById(id, { transaction: ctx.transaction });
    const images = await ProductImage.findAll({ where: { product_id: id }, transaction: ctx.transaction });
    ctx.toDelete.push(...images.map((img) => img.path));
    // Imagens, opções e vínculos com categorias são removidos em cascata (ON DELETE CASCADE)
    await product.destroy({ transaction: ctx.transaction });
  });
}

module.exports = {
  search,
  getById,
  create,
  update,
  remove,
  // exportados para testes unitários
  parseOption,
  parseOptionFilters,
  formatOption,
};
