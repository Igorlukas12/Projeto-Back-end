/**
 * Controller de usuários: traduz HTTP <-> service.
 */
const userService = require('../services/userService');
const { parseId } = require('../utils/validators');

module.exports = {
  async getById(req, res) {
    res.status(200).json(await userService.getById(parseId(req.params.id)));
  },

  async create(req, res) {
    res.status(201).json(await userService.create(req.body));
  },

  async update(req, res) {
    await userService.update(parseId(req.params.id), req.body);
    res.status(204).end();
  },

  async remove(req, res) {
    await userService.remove(parseId(req.params.id));
    res.status(204).end();
  },

  async token(req, res) {
    res.status(200).json(await userService.generateToken(req.body));
  },
};
