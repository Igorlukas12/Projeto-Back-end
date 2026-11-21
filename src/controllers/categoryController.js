/**
 * Controller de categorias.
 */
const categoryService = require('../services/categoryService');
const { parseId } = require('../utils/validators');

module.exports = {
  async search(req, res) {
    res.status(200).json(await categoryService.search(req.query));
  },

  async getById(req, res) {
    res.status(200).json(await categoryService.getById(parseId(req.params.id)));
  },

  async create(req, res) {
    res.status(201).json(await categoryService.create(req.body));
  },

  async update(req, res) {
    await categoryService.update(parseId(req.params.id), req.body);
    res.status(204).end();
  },

  async remove(req, res) {
    await categoryService.remove(parseId(req.params.id));
    res.status(204).end();
  },
};
