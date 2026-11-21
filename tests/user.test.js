const { app, request, sequelize, resetDatabase, authHeader } = require('./helpers');

describe('Usuários e autenticação', () => {
  beforeAll(resetDatabase);
  afterAll(() => sequelize.close());

  const payload = {
    firstname: 'Maria',
    surname: 'Silva',
    email: 'maria@mail.com',
    password: '123@123',
    confirmPassword: '123@123',
  };
  let userId;
  let auth;

  test('POST /v1/user cria um usuário (201) sem expor a senha', async () => {
    const res = await request(app).post('/v1/user').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), firstname: 'Maria', surname: 'Silva', email: 'maria@mail.com' });
    userId = res.body.id;
  });

  test('POST /v1/user retorna 400 para e-mail duplicado', async () => {
    const res = await request(app).post('/v1/user').send(payload);
    expect(res.status).toBe(400);
  });

  test('POST /v1/user retorna 400 quando as senhas não conferem', async () => {
    const res = await request(app)
      .post('/v1/user')
      .send({ ...payload, email: 'outra@mail.com', confirmPassword: 'diferente' });
    expect(res.status).toBe(400);
  });

  test('POST /v1/user retorna 400 para campos faltando ou JSON inválido', async () => {
    expect((await request(app).post('/v1/user').send({ email: 'x@mail.com' })).status).toBe(400);
    const bad = await request(app).post('/v1/user').set('Content-Type', 'application/json').send('{"a":');
    expect(bad.status).toBe(400);
  });

  test('GET /v1/user/:id retorna o usuário (200) ou 404', async () => {
    const res = await request(app).get(`/v1/user/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('password');
    expect((await request(app).get('/v1/user/9999')).status).toBe(404);
    expect((await request(app).get('/v1/user/abc')).status).toBe(404);
  });

  test('POST /v1/user/token gera token (200) e rejeita credenciais inválidas', async () => {
    const ok = await request(app).post('/v1/user/token').send({ email: payload.email, password: payload.password });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toEqual(expect.any(String));
    auth = { Authorization: `Bearer ${ok.body.token}` };

    const wrong = await request(app).post('/v1/user/token').send({ email: payload.email, password: 'errada' });
    expect(wrong.status).toBe(401);
    expect((await request(app).post('/v1/user/token').send({})).status).toBe(400);
  });

  test('PUT /v1/user/:id exige token (401)', async () => {
    const res = await request(app).put(`/v1/user/${userId}`).send({ firstname: 'Nova' });
    expect(res.status).toBe(401);
    const invalid = await request(app)
      .put(`/v1/user/${userId}`)
      .set('Authorization', 'Bearer token-invalido')
      .send({ firstname: 'Nova' });
    expect(invalid.status).toBe(401);
  });

  test('PUT /v1/user/:id atualiza (204), valida (400) e retorna 404', async () => {
    const res = await request(app).put(`/v1/user/${userId}`).set(auth).send({ firstname: 'Mariana', surname: 'Souza' });
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get(`/v1/user/${userId}`)).body.firstname).toBe('Mariana');

    expect((await request(app).put(`/v1/user/${userId}`).set(auth).send({ email: 'invalido' })).status).toBe(400);
    expect((await request(app).put(`/v1/user/${userId}`).set(auth).send({})).status).toBe(400);
    expect((await request(app).put('/v1/user/9999').set(auth).send({ firstname: 'X' })).status).toBe(404);
  });

  test('DELETE /v1/user/:id remove (204) e retorna 404 depois', async () => {
    const otherAuth = await authHeader('admin@mail.com');
    expect((await request(app).delete(`/v1/user/${userId}`)).status).toBe(401);
    expect((await request(app).delete(`/v1/user/${userId}`).set(otherAuth)).status).toBe(204);
    expect((await request(app).get(`/v1/user/${userId}`)).status).toBe(404);
    expect((await request(app).delete(`/v1/user/${userId}`).set(otherAuth)).status).toBe(404);
  });

  test('token de usuário removido deixa de ser aceito (401)', async () => {
    const res = await request(app).put(`/v1/user/${userId}`).set(auth).send({ firstname: 'X' });
    expect(res.status).toBe(401);
  });
});
