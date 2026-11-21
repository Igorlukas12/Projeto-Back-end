/**
 * Controller de produtos.
 */
const productService = require('../services/productService');
const { parseId } = require('../utils/validators');
const baseUrl = require('../utils/baseUrl');

module.exports = {
  async search(req, res) {
    res.status(200).json(await productService.search(req.query, baseUrl(req)));
  },

  async getById(req, res) {
    res.status(200).json(await productService.getById(parseId(req.params.id), baseUrl(req)));
  },

  async create(req, res) {
    res.status(201).json(await productService.create(req.body, baseUrl(req)));
  },

  async update(req, res) {
    await productService.update(parseId(req.params.id), req.body);
    res.status(204).end();
  },

  async remove(req, res) {
    await productService.remove(parseId(req.params.id));
    res.status(204).end();
  },
};
