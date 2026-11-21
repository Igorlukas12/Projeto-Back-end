/**
 * Regras de negócio de usuários e autenticação.
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const HttpError = require('../utils/HttpError');
const v = require('../utils/validators');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

/** Formato público do usuário (nunca expõe a senha). */
const toPublic = (user) => ({
  id: user.id,
  firstname: user.firstname,
  surname: user.surname,
  email: user.email,
});

async function ensureEmailIsFree(email, ignoreId) {
  const where = { email };
  if (ignoreId) where.id = { [Op.ne]: ignoreId };
  if (await User.count({ where })) throw HttpError.badRequest('E-mail já cadastrado');
}

async function findById(id) {
  const user = await User.findByPk(id);
  if (!user) throw HttpError.notFound('Usuário não encontrado');
  return user;
}

async function getById(id) {
  return toPublic(await findById(id));
}

async function create(body) {
  v.ensureBody(body);
  const firstname = v.requireString(body.firstname, 'firstname');
  const surname = v.requireString(body.surname, 'surname');
  const email = v.requireEmail(body.email);
  const password = v.requireString(body.password, 'password');
  const confirmPassword = v.requireString(body.confirmPassword, 'confirmPassword');

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw HttpError.badRequest(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (password !== confirmPassword) throw HttpError.badRequest('As senhas não conferem');

  await ensureEmailIsFree(email);

  const user = await User.create({
    firstname,
    surname,
    email,
    password: await bcrypt.hash(password, SALT_ROUNDS),
  });
  return toPublic(user);
}

async function update(id, body) {
  v.ensureBody(body);
  const user = await findById(id);

  const data = {};
  if (body.firstname !== undefined) data.firstname = v.requireString(body.firstname, 'firstname');
  if (body.surname !== undefined) data.surname = v.requireString(body.surname, 'surname');
  if (body.email !== undefined) {
    data.email = v.requireEmail(body.email);
    await ensureEmailIsFree(data.email, id);
  }
  if (Object.keys(data).length === 0) {
    throw HttpError.badRequest('Informe ao menos um campo: firstname, surname ou email');
  }

  await user.update(data);
}

async function remove(id) {
  const user = await findById(id);
  await user.destroy();
}

/** Valida e-mail/senha e devolve um JWT. */
async function generateToken(body) {
  v.ensureBody(body);
  const email = v.requireEmail(body.email);
  const password = v.requireString(body.password, 'password');

  const user = await User.scope('withPassword').findOne({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.password));
  if (!valid) throw HttpError.unauthorized('E-mail ou senha inválidos');

  const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token };
}

module.exports = { getById, create, update, remove, generateToken };
