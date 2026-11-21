/**
 * Regras de negócio de categorias.
 */
const { Op } = require('sequelize');
const { Category } = require('../models');
const HttpError = require('../utils/HttpError');
const v = require('../utils/validators');

const PUBLIC_FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

const toPublic = (c) => ({ id: c.id, name: c.name, slug: c.slug, use_in_menu: c.use_in_menu });

async function ensureSlugIsFree(slug, ignoreId) {
  const where = { slug };
  if (ignoreId) where.id = { [Op.ne]: ignoreId };
  if (await Category.count({ where })) throw HttpError.badRequest('Slug já cadastrado');
}

async function findById(id) {
  const category = await Category.findByPk(id);
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  return category;
}

/** Busca paginada com filtros: limit, page, fields, use_in_menu. */
async function search(query) {
  const { limit, page, sql } = v.parsePagination(query);
  const fields = v.parseFields(query.fields, PUBLIC_FIELDS);
  const useInMenu = v.parseBooleanQuery(query.use_in_menu, 'use_in_menu');

  const where = {};
  if (useInMenu !== undefined) where.use_in_menu = useInMenu;

  const { rows, count } = await Category.findAndCountAll({
    where,
    attributes: fields || PUBLIC_FIELDS,
    order: [['id', 'ASC']],
    ...sql,
  });

  return { data: rows.map((r) => r.get({ plain: true })), total: count, limit, page };
}

async function getById(id) {
  return toPublic(await findById(id));
}

async function create(body) {
  v.ensureBody(body);
  const data = {
    name: v.requireString(body.name, 'name'),
    slug: v.requireString(body.slug, 'slug'),
    use_in_menu: v.optionalBoolean(body.use_in_menu, 'use_in_menu') ?? false,
  };
  await ensureSlugIsFree(data.slug);
  return toPublic(await Category.create(data));
}

async function update(id, body) {
  v.ensureBody(body);
  const category = await findById(id);

  const data = {};
  if (body.name !== undefined) data.name = v.requireString(body.name, 'name');
  if (body.slug !== undefined) {
    data.slug = v.requireString(body.slug, 'slug');
    await ensureSlugIsFree(data.slug, id);
  }
  if (body.use_in_menu !== undefined) data.use_in_menu = v.optionalBoolean(body.use_in_menu, 'use_in_menu');
  if (Object.keys(data).length === 0) {
    throw HttpError.badRequest('Informe ao menos um campo: name, slug ou use_in_menu');
  }

  await category.update(data);
}

async function remove(id) {
  const category = await findById(id);
  await category.destroy();
}

module.exports = { search, getById, create, update, remove };
