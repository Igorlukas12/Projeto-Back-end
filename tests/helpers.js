/** Utilitários compartilhados pelos testes de integração. */
const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==';

/** Recria o schema do banco em memória. */
const resetDatabase = () => sequelize.sync({ force: true });

/** Cria um usuário e devolve o header Authorization pronto para uso. */
async function authHeader(email = 'tester@mail.com') {
  await request(app).post('/v1/user').send({
    firstname: 'Test',
    surname: 'User',
    email,
    password: '123456',
    confirmPassword: '123456',
  });
  const res = await request(app).post('/v1/user/token').send({ email, password: '123456' });
  return { Authorization: `Bearer ${res.body.token}` };
}

module.exports = { app, request, sequelize, resetDatabase, authHeader, PNG_1PX };
