const { app, request, sequelize, resetDatabase, authHeader } = require('./helpers');

describe('Categorias', () => {
  let auth;
  let categoryId;

  beforeAll(async () => {
    await resetDatabase();
    auth = await authHeader();
  });
  afterAll(() => sequelize.close());

  test('POST /v1/category exige token (401)', async () => {
    const res = await request(app).post('/v1/category').send({ name: 'Shoes', slug: 'shoes' });
    expect(res.status).toBe(401);
  });

  test('POST /v1/category cria (201) e valida (400)', async () => {
    const res = await request(app).post('/v1/category').set(auth).send({ name: 'Shoes', slug: 'shoes', use_in_menu: true });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), name: 'Shoes', slug: 'shoes', use_in_menu: true });
    categoryId = res.body.id;

    expect((await request(app).post('/v1/category').set(auth).send({ name: 'Dup', slug: 'shoes' })).status).toBe(400);
    expect((await request(app).post('/v1/category').set(auth).send({ slug: 'x' })).status).toBe(400);
    expect((await request(app).post('/v1/category').set(auth).send({ name: 'X', slug: 'x', use_in_menu: 'sim' })).status).toBe(400);
  });

  test('GET /v1/category/:id retorna 200 ou 404', async () => {
    const res = await request(app).get(`/v1/category/${categoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('shoes');
    expect((await request(app).get('/v1/category/9999')).status).toBe(404);
  });

  test('GET /v1/category/search pagina, filtra e seleciona campos', async () => {
    for (let i = 1; i <= 14; i += 1) {
      await request(app).post('/v1/category').set(auth).send({ name: `Cat ${i}`, slug: `cat-${i}`, use_in_menu: i % 2 === 0 });
    }

    const page1 = await request(app).get('/v1/category/search');
    expect(page1.status).toBe(200);
    expect(page1.body).toMatchObject({ total: 15, limit: 12, page: 1 });
    expect(page1.body.data).toHaveLength(12);

    const page2 = await request(app).get('/v1/category/search?page=2');
    expect(page2.body.data).toHaveLength(3);

    const all = await request(app).get('/v1/category/search?limit=-1&page=5');
    expect(all.body.data).toHaveLength(15);
    expect(all.body).toMatchObject({ limit: -1, page: 5 });

    const menu = await request(app).get('/v1/category/search?use_in_menu=true&limit=-1');
    expect(menu.body.total).toBe(8);
    expect(menu.body.data.every((c) => c.use_in_menu === true)).toBe(true);

    const fields = await request(app).get('/v1/category/search?fields=name,slug&limit=1');
    expect(Object.keys(fields.body.data[0]).sort()).toEqual(['name', 'slug']);
  });

  test('GET /v1/category/search retorna 400 para parâmetros inválidos', async () => {
    expect((await request(app).get('/v1/category/search?limit=0')).status).toBe(400);
    expect((await request(app).get('/v1/category/search?page=abc')).status).toBe(400);
    expect((await request(app).get('/v1/category/search?fields=senha')).status).toBe(400);
    expect((await request(app).get('/v1/category/search?use_in_menu=talvez')).status).toBe(400);
  });

  test('PUT /v1/category/:id atualiza (204), valida (400) e retorna 404', async () => {
    const res = await request(app).put(`/v1/category/${categoryId}`).set(auth).send({ name: 'Sapatos', use_in_menu: false });
    expect(res.status).toBe(204);
    const updated = await request(app).get(`/v1/category/${categoryId}`);
    expect(updated.body).toMatchObject({ name: 'Sapatos', use_in_menu: false });

    expect((await request(app).put(`/v1/category/${categoryId}`).set(auth).send({ slug: 'cat-1' })).status).toBe(400);
    expect((await request(app).put('/v1/category/9999').set(auth).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).put(`/v1/category/${categoryId}`).send({ name: 'X' })).status).toBe(401);
  });

  test('DELETE /v1/category/:id remove (204), 401 sem token e 404 inexistente', async () => {
    expect((await request(app).delete(`/v1/category/${categoryId}`)).status).toBe(401);
    expect((await request(app).delete(`/v1/category/${categoryId}`).set(auth)).status).toBe(204);
    expect((await request(app).delete(`/v1/category/${categoryId}`).set(auth)).status).toBe(404);
  });
});
