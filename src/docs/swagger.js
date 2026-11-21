/**
 * Especificação OpenAPI 3 da API, servida em /docs (Swagger UI) e /docs.json.
 */

const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const R = {
  400: errorResponse('Dados da requisição inválidos'),
  401: errorResponse('Token ausente, inválido ou credenciais incorretas'),
  404: errorResponse('Recurso não encontrado'),
  204: { description: 'Sucesso, sem conteúdo' },
};

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 },
};

const paginationParams = [
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 }, description: 'Itens por página. -1 retorna todos.' },
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Página (ignorado quando limit=-1).' },
];

const json = (schema) => ({ content: { 'application/json': { schema } } });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const security = [{ bearerAuth: [] }];

const listOf = (item) => ({
  type: 'object',
  properties: {
    data: { type: 'array', items: ref(item) },
    total: { type: 'integer', example: 10 },
    limit: { type: 'integer', example: 12 },
    page: { type: 'integer', example: 1 },
  },
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Projeto Back-end — API de Loja',
    version: '1.0.0',
    description:
      'API REST com usuários, categorias e produtos. Rotas POST/PUT/DELETE (exceto cadastro e login) exigem ' +
      'o header `Authorization: Bearer <token>`, obtido em `POST /v1/user/token`.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Usuários' }, { name: 'Autenticação' }, { name: 'Categorias' }, { name: 'Produtos' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string' }, details: {} },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', example: 'user@mail.com' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
        properties: {
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', example: 'user@mail.com' },
          password: { type: 'string', minLength: 6, example: '123@123' },
          confirmPassword: { type: 'string', example: '123@123' },
        },
      },
      UserUpdate: {
        type: 'object',
        properties: {
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', example: 'user@mail.com' },
        },
      },
      TokenRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@example.com' },
          password: { type: 'string', example: '123456' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      ProductImage: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          content: { type: 'string', example: 'http://localhost:3000/media/products/1/image.png' },
        },
      },
      ProductOption: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Cor' },
          shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
          radius: { type: 'integer', example: 4 },
          type: { type: 'string', enum: ['text', 'color'], example: 'text' },
          values: { type: 'array', items: { type: 'string' }, example: ['PP', 'GG', 'M'] },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          use_in_menu: { type: 'boolean', example: false },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 15, 24, 68] },
          images: { type: 'array', items: ref('ProductImage') },
          options: { type: 'array', items: ref('ProductOption') },
        },
      },
      ProductOptionInput: {
        type: 'object',
        description:
          'Nova opção (sem id), remoção ({ id, deleted: true }) ou atualização parcial ({ id, ...campos }). ' +
          '"radius" aceita inteiro ou texto como "4px"; "values" (ou "value") aceita lista ou texto separado por vírgula.',
        properties: {
          id: { type: 'integer' },
          deleted: { type: 'boolean' },
          title: { type: 'string', example: 'Cor' },
          shape: { type: 'string', enum: ['square', 'circle'] },
          radius: { oneOf: [{ type: 'integer' }, { type: 'string' }], example: '4px' },
          type: { type: 'string', enum: ['text', 'color'] },
          values: { type: 'array', items: { type: 'string' }, example: ['PP', 'GG', 'M'] },
        },
      },
      ProductImageInput: {
        type: 'object',
        description:
          'Nova imagem ({ type, content: base64 }), remoção ({ id, deleted: true }) ou ' +
          'substituição ({ id, type, content: base64 }). Enviar { id, content: URL } mantém a imagem.',
        properties: {
          id: { type: 'integer' },
          deleted: { type: 'boolean' },
          type: { type: 'string', example: 'image/png' },
          content: { type: 'string', example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          use_in_menu: { type: 'boolean', example: false },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1] },
          images: { type: 'array', items: ref('ProductImageInput') },
          options: { type: 'array', items: ref('ProductOptionInput') },
        },
      },
    },
  },
  paths: {
    '/v1/user/token': {
      post: {
        tags: ['Autenticação'],
        summary: 'Gera um token JWT',
        requestBody: { required: true, ...json(ref('TokenRequest')) },
        responses: {
          200: { description: 'Token gerado', ...json({ type: 'object', properties: { token: { type: 'string' } } }) },
          400: R[400],
          401: R[401],
        },
      },
    },
    '/v1/user': {
      post: {
        tags: ['Usuários'],
        summary: 'Cadastra um usuário',
        requestBody: { required: true, ...json(ref('UserCreate')) },
        responses: { 201: { description: 'Usuário criado', ...json(ref('User')) }, 400: R[400] },
      },
    },
    '/v1/user/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Usuários'],
        summary: 'Obtém um usuário pelo ID',
        responses: { 200: { description: 'Usuário', ...json(ref('User')) }, 404: R[404] },
      },
      put: {
        tags: ['Usuários'],
        summary: 'Atualiza um usuário',
        security,
        requestBody: { required: true, ...json(ref('UserUpdate')) },
        responses: { 204: R[204], 400: R[400], 401: R[401], 404: R[404] },
      },
      delete: {
        tags: ['Usuários'],
        summary: 'Remove um usuário',
        security,
        responses: { 204: R[204], 401: R[401], 404: R[404] },
      },
    },
    '/v1/category/search': {
      get: {
        tags: ['Categorias'],
        summary: 'Lista categorias com paginação e filtros',
        parameters: [
          ...paginationParams,
          { name: 'fields', in: 'query', schema: { type: 'string' }, example: 'name,slug', description: 'Campos retornados' },
          { name: 'use_in_menu', in: 'query', schema: { type: 'boolean' }, description: 'Filtra categorias do menu' },
        ],
        responses: { 200: { description: 'Lista de categorias', ...json(listOf('Category')) }, 400: R[400] },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categorias'],
        summary: 'Cria uma categoria',
        security,
        requestBody: { required: true, ...json(ref('CategoryInput')) },
        responses: { 201: { description: 'Categoria criada', ...json(ref('Category')) }, 400: R[400], 401: R[401] },
      },
    },
    '/v1/category/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Categorias'],
        summary: 'Obtém uma categoria pelo ID',
        responses: { 200: { description: 'Categoria', ...json(ref('Category')) }, 404: R[404] },
      },
      put: {
        tags: ['Categorias'],
        summary: 'Atualiza uma categoria',
        security,
        requestBody: { required: true, ...json(ref('CategoryInput')) },
        responses: { 204: R[204], 400: R[400], 401: R[401], 404: R[404] },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Remove uma categoria',
        security,
        responses: { 204: R[204], 401: R[401], 404: R[404] },
      },
    },
    '/v1/product/search': {
      get: {
        tags: ['Produtos'],
        summary: 'Lista produtos com paginação e filtros',
        parameters: [
          ...paginationParams,
          { name: 'fields', in: 'query', schema: { type: 'string' }, example: 'name,images,price' },
          { name: 'match', in: 'query', schema: { type: 'string' }, description: 'Texto buscado no nome ou descrição' },
          { name: 'category_ids', in: 'query', schema: { type: 'string' }, example: '15,24' },
          { name: 'price-range', in: 'query', schema: { type: 'string' }, example: '100-200' },
          {
            name: 'option[45]',
            in: 'query',
            schema: { type: 'string' },
            example: 'GG,PP',
            description: 'Filtro por valores da opção de ID 45 (troque 45 pelo ID desejado)',
          },
        ],
        responses: { 200: { description: 'Lista de produtos', ...json(listOf('Product')) }, 400: R[400] },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Produtos'],
        summary: 'Cria um produto',
        security,
        requestBody: { required: true, ...json(ref('ProductInput')) },
        responses: { 201: { description: 'Produto criado', ...json(ref('Product')) }, 400: R[400], 401: R[401] },
      },
    },
    '/v1/product/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Produtos'],
        summary: 'Obtém um produto pelo ID',
        responses: { 200: { description: 'Produto', ...json(ref('Product')) }, 404: R[404] },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualiza um produto (todos os campos são opcionais)',
        security,
        requestBody: { required: true, ...json(ref('ProductInput')) },
        responses: { 204: R[204], 400: R[400], 401: R[401], 404: R[404] },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Remove um produto',
        security,
        responses: { 204: R[204], 401: R[401], 404: R[404] },
      },
    },
  },
};
