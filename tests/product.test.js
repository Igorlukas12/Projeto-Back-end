const fs = require('fs');
const path = require('path');
const { app, request, sequelize, resetDatabase, authHeader, PNG_1PX } = require('./helpers');

const uploadDir = process.env.UPLOAD_DIR;
const fileFromUrl = (url) => path.join(uploadDir, url.split('/media/')[1]);

describe('Produtos', () => {
  let auth;
  let cat1;
  let cat2;
  let product;

  const basePayload = () => ({
    enabled: true,
    name: 'Produto 01',
    slug: 'produto-01',
    stock: 10,
    description: 'Descrição do produto 01',
    price: 119.9,
    price_with_discount: 99.9,
    category_ids: [cat1, cat2],
    images: [
      { type: 'image/png', content: PNG_1PX },
      { type: 'image/jpg', content: `data:image/jpg;base64,${PNG_1PX}` },
    ],
    options: [
      { title: 'Cor', shape: 'square', radius: '4px', type: 'text', value: ['PP', 'GG', 'M'] },
      { title: 'Tamanho', shape: 'circle', type: 'text', values: '42/43,44/45' },
    ],
  });

  beforeAll(async () => {
    await resetDatabase();
    auth = await authHeader();
    cat1 = (await request(app).post('/v1/category').set(auth).send({ name: 'A', slug: 'a' })).body.id;
    cat2 = (await request(app).post('/v1/category').set(auth).send({ name: 'B', slug: 'b' })).body.id;
  });
  afterAll(async () => {
    await sequelize.close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  test('POST /v1/product exige token (401)', async () => {
    expect((await request(app).post('/v1/product').send(basePayload())).status).toBe(401);
  });

  test('POST /v1/product cria com categorias, imagens e opções (201)', async () => {
    const res = await request(app).post('/v1/product').set(auth).send(basePayload());
    expect(res.status).toBe(201);
    product = res.body;

    expect(product).toMatchObject({
      enabled: true,
      name: 'Produto 01',
      slug: 'produto-01',
      stock: 10,
      price: 119.9,
      price_with_discount: 99.9,
      category_ids: [cat1, cat2],
    });
    expect(product.images).toHaveLength(2);
    product.images.forEach((img) => {
      expect(img.content).toMatch(/^http:\/\/localhost:3000\/media\/products\/\d+\/.+\.(png|jpg)$/);
      expect(fs.existsSync(fileFromUrl(img.content))).toBe(true);
    });
    expect(product.options).toEqual([
      { id: expect.any(Number), title: 'Cor', shape: 'square', radius: 4, type: 'text', values: ['PP', 'GG', 'M'] },
      { id: expect.any(Number), title: 'Tamanho', shape: 'circle', radius: 0, type: 'text', values: ['42/43', '44/45'] },
    ]);
  });

  test('a imagem salva é servida em /media', async () => {
    const url = new URL(product.images[0].content);
    const res = await request(app).get(url.pathname);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image/);
  });

  test('POST /v1/product valida o payload (400) sem deixar arquivos órfãos', async () => {
    const cases = [
      { ...basePayload(), slug: 'produto-01' }, // slug duplicado
      { ...basePayload(), slug: 'x1', price: 'caro' },
      { ...basePayload(), slug: 'x2', category_ids: [9999] },
      { ...basePayload(), slug: 'x3', images: [{ type: 'application/pdf', content: PNG_1PX }] },
      { ...basePayload(), slug: 'x4', images: [{ type: 'image/png', content: '***' }] },
      { ...basePayload(), slug: 'x5', options: [{ title: 'Cor', shape: 'triangle', values: ['A'] }] },
      { ...basePayload(), slug: 'x6', options: [{ title: 'Cor' }] },
      { name: 'Sem preço', slug: 'x7' },
    ];
    const filesBefore = fs.readdirSync(path.join(uploadDir, 'products'), { recursive: true }).length;
    for (const body of cases) {
      const res = await request(app).post('/v1/product').set(auth).send(body);
      expect(res.status).toBe(400);
    }
    const filesAfter = fs.readdirSync(path.join(uploadDir, 'products'), { recursive: true }).length;
    expect(filesAfter).toBe(filesBefore);
    const list = await request(app).get('/v1/product/search');
    expect(list.body.total).toBe(1);
  });

  test('GET /v1/product/:id retorna 200 ou 404', async () => {
    const res = await request(app).get(`/v1/product/${product.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(product);
    expect((await request(app).get('/v1/product/9999')).status).toBe(404);
  });

  test('PUT /v1/product/:id atualiza campos, categorias, imagens e opções (204)', async () => {
    const [img1, img2] = product.images;
    const [opt1, opt2] = product.options;

    const res = await request(app)
      .put(`/v1/product/${product.id}`)
      .set(auth)
      .send({
        name: 'Produto 01 atualizado',
        stock: 20,
        category_ids: [cat2],
        images: [
          { type: 'image/png', content: PNG_1PX }, // nova
          { id: img1.id, deleted: true }, // removida
          { id: img2.id, content: img2.content }, // mantida (URL)
        ],
        options: [
          { id: opt1.id, deleted: true },
          { id: opt2.id, radius: '10px', values: ['42/43', '48/49'] },
          { title: 'Material', shape: 'square', type: 'text', values: ['Couro'] },
        ],
      });
    expect(res.status).toBe(204);

    const updated = (await request(app).get(`/v1/product/${product.id}`)).body;
    expect(updated).toMatchObject({ name: 'Produto 01 atualizado', stock: 20, category_ids: [cat2] });
    expect(updated.images).toHaveLength(2);
    expect(updated.images.map((i) => i.id)).toContain(img2.id);
    expect(fs.existsSync(fileFromUrl(img1.content))).toBe(false);
    expect(updated.options).toEqual([
      { id: opt2.id, title: 'Tamanho', shape: 'circle', radius: 10, type: 'text', values: ['42/43', '48/49'] },
      expect.objectContaining({ title: 'Material', values: ['Couro'] }),
    ]);
    product = updated;
  });

  test('PUT /v1/product/:id retorna 400, 401 e 404 quando apropriado', async () => {
    expect((await request(app).put(`/v1/product/${product.id}`).send({ name: 'X' })).status).toBe(401);
    expect((await request(app).put('/v1/product/9999').set(auth).send({ name: 'X' })).status).toBe(404);
    expect((await request(app).put(`/v1/product/${product.id}`).set(auth).send({ price: -1 })).status).toBe(400);
    expect(
      (await request(app).put(`/v1/product/${product.id}`).set(auth).send({ images: [{ id: 9999, deleted: true }] })).status,
    ).toBe(400);
    // nada foi alterado pela requisição inválida
    expect((await request(app).get(`/v1/product/${product.id}`)).body).toEqual(product);
  });

  describe('GET /v1/product/search', () => {
    beforeAll(async () => {
      const make = (i, extra = {}) =>
        request(app)
          .post('/v1/product')
          .set(auth)
          .send({ name: `Tênis ${i}`, slug: `tenis-${i}`, price: i * 50, price_with_discount: i * 45, ...extra });
      await make(1, { category_ids: [cat1], description: 'Corrida' });
      await make(2, { category_ids: [cat1, cat2] });
      await make(3, { options: [{ title: 'Tamanho', values: ['PP', 'GG'] }] });
      await make(4);
    });

    test('pagina com limit/page e retorna total', async () => {
      const res = await request(app).get('/v1/product/search?limit=2&page=2');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 5, limit: 2, page: 2 });
      expect(res.body.data).toHaveLength(2);
      const all = await request(app).get('/v1/product/search?limit=-1');
      expect(all.body.data).toHaveLength(5);
    });

    test('seleciona campos com fields', async () => {
      const res = await request(app).get('/v1/product/search?fields=name,images,price&limit=1');
      expect(Object.keys(res.body.data[0]).sort()).toEqual(['images', 'name', 'price']);
    });

    test('filtra por match (nome ou descrição)', async () => {
      const byName = await request(app).get('/v1/product/search?match=Tênis');
      expect(byName.body.total).toBe(4);
      const byDescription = await request(app).get('/v1/product/search?match=corrida');
      expect(byDescription.body.data.map((p) => p.slug)).toEqual(['tenis-1']);
    });

    test('filtra por category_ids', async () => {
      const res = await request(app).get(`/v1/product/search?category_ids=${cat1}`);
      expect(res.body.data.map((p) => p.slug)).toEqual(['tenis-1', 'tenis-2']);
      const both = await request(app).get(`/v1/product/search?category_ids=${cat1},${cat2}`);
      expect(both.body.total).toBe(3);
    });

    test('filtra por price-range', async () => {
      const res = await request(app).get('/v1/product/search?price-range=100-200');
      expect(res.body.data.map((p) => p.slug)).toEqual(['produto-01', 'tenis-2', 'tenis-3', 'tenis-4']);
    });

    test('filtra por option[id]', async () => {
      const tenis3 = (await request(app).get('/v1/product/search?match=Tênis 3')).body.data[0];
      const optionId = tenis3.options[0].id;
      const hit = await request(app).get(`/v1/product/search?option[${optionId}]=GG,XG`);
      expect(hit.body.data.map((p) => p.slug)).toEqual(['tenis-3']);
      const miss = await request(app).get(`/v1/product/search?option[${optionId}]=G`);
      expect(miss.body.total).toBe(0);
    });

    test('combina filtros', async () => {
      const res = await request(app).get(`/v1/product/search?category_ids=${cat1}&price-range=0-60`);
      expect(res.body.data.map((p) => p.slug)).toEqual(['tenis-1']);
    });

    test('retorna 400 para parâmetros inválidos', async () => {
      for (const qs of ['limit=-5', 'page=0', 'fields=senha', 'price-range=abc', 'price-range=200-100', 'category_ids=a,b']) {
        expect((await request(app).get(`/v1/product/search?${qs}`)).status).toBe(400);
      }
    });
  });

  test('DELETE /v1/product/:id remove produto e arquivos (204), 401 e 404', async () => {
    expect((await request(app).delete(`/v1/product/${product.id}`)).status).toBe(401);
    expect((await request(app).delete(`/v1/product/${product.id}`).set(auth)).status).toBe(204);
    product.images.forEach((img) => expect(fs.existsSync(fileFromUrl(img.content))).toBe(false));
    expect((await request(app).get(`/v1/product/${product.id}`)).status).toBe(404);
    expect((await request(app).delete(`/v1/product/${product.id}`).set(auth)).status).toBe(404);
  });
});
