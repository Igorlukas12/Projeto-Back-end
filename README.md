# Projeto Back-end — API de Loja

API REST de uma loja (usuários, categorias e produtos), feita para o
[projeto final de Back-end da Digital College](https://github.com/digitalcollegebr/projeto-backend).

**Integrante:** Igor Lucas ([@Igorlukas12](https://github.com/Igorlukas12))

## Tecnologias

| Item | Uso |
|---|---|
| Node.js + Express | Servidor HTTP e rotas |
| MySQL + Sequelize | Banco de dados, ORM, migrations e seeders (`sequelize-cli`) |
| JWT (`jsonwebtoken`) + `bcrypt` | Autenticação e hash de senhas |
| Swagger (`swagger-ui-express`) | Documentação interativa da API |
| Jest + Supertest | Testes unitários e de integração |
| dotenv / nodemon | Configuração e ambiente de desenvolvimento |

## Estrutura do projeto (MVC + Services)

```
src/
  config/        # conexão com o banco e variáveis de ambiente
  controllers/   # recebem a requisição e devolvem a resposta HTTP
  database/
    migrations/  # criação das tabelas
    seeders/     # dados de exemplo
  docs/          # especificação OpenAPI (Swagger)
  middleware/    # autenticação JWT e tratamento de erros
  models/        # models do Sequelize e relacionamentos
  routes/        # definição dos endpoints
  services/      # regras de negócio e validações
  utils/         # funções auxiliares (validação, erros HTTP)
  app.js         # configuração do Express
  server.js      # inicialização do servidor
tests/           # testes Jest
```

O fluxo de uma requisição é: `routes → middleware → controller → service → model`.
Os controllers apenas traduzem HTTP; toda regra de negócio fica nos services, e os
erros são lançados como `HttpError` e convertidos em resposta pelo `errorHandler`.

## Como rodar

### 1. Pré-requisitos

- Node.js 18 ou superior
- MySQL 8 (ou MariaDB). Se tiver Docker, basta: `docker compose up -d`

### 2. Instalação

```bash
git clone https://github.com/Igorlukas12/Projeto-Back-end.git
cd Projeto-Back-end
npm install
cp .env.example .env   # ajuste usuário/senha do banco e o JWT_SECRET
```

### 3. Banco de dados

```bash
npm run db:create    # cria o banco definido em DB_NAME
npm run db:migrate   # cria as tabelas
npm run db:seed      # (opcional) dados de exemplo
```

O seed cria o usuário **admin@example.com / 123456**, três categorias e um produto.
Para recriar tudo do zero: `npm run db:reset`.

### 4. Executar

```bash
npm run dev    # desenvolvimento (nodemon)
npm start      # produção
```

- API: http://localhost:3000/v1
- Documentação Swagger: http://localhost:3000/docs (JSON em `/docs.json`)

### 5. Testes

```bash
npm test
npm run test:coverage
```

Os testes usam SQLite em memória, então **não precisam de MySQL** rodando.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor |
| `APP_URL` | derivada da requisição | URL pública usada nos links das imagens |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | Endereço do MySQL |
| `DB_USER` / `DB_PASS` / `DB_NAME` | `root` / vazio / `projeto_backend` | Credenciais e nome do banco |
| `JWT_SECRET` | — | Segredo de assinatura do token (**troque em produção**) |
| `JWT_EXPIRES_IN` | `1h` | Validade do token |
| `UPLOAD_DIR` | `uploads` | Pasta onde as imagens dos produtos são salvas |

## Autenticação

1. Cadastre um usuário em `POST /v1/user` (rota pública).
2. Gere um token em `POST /v1/user/token` com `{ "email", "password" }`.
3. Envie o header `Authorization: Bearer <token>` nas rotas `POST`, `PUT` e `DELETE`.

Rotas `GET`, o cadastro e o login são públicos. Token ausente, inválido, expirado ou de
um usuário já removido retorna **401**.

## Endpoints

| Método | Rota | Auth | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/v1/user/token` | — | 200 `{ token }` | 400, 401 |
| GET | `/v1/user/:id` | — | 200 | 404 |
| POST | `/v1/user` | — | 201 | 400 |
| PUT | `/v1/user/:id` | JWT | 204 | 400, 401, 404 |
| DELETE | `/v1/user/:id` | JWT | 204 | 401, 404 |
| GET | `/v1/category/search` | — | 200 | 400 |
| GET | `/v1/category/:id` | — | 200 | 404 |
| POST | `/v1/category` | JWT | 201 | 400, 401 |
| PUT | `/v1/category/:id` | JWT | 204 | 400, 401, 404 |
| DELETE | `/v1/category/:id` | JWT | 204 | 401, 404 |
| GET | `/v1/product/search` | — | 200 | 400 |
| GET | `/v1/product/:id` | — | 200 | 404 |
| POST | `/v1/product` | JWT | 201 | 400, 401 |
| PUT | `/v1/product/:id` | JWT | 204 | 400, 401, 404 |
| DELETE | `/v1/product/:id` | JWT | 204 | 401, 404 |

Erros sempre retornam JSON no formato `{ "message": "...", "details": ... }`.

### Busca de categorias — `GET /v1/category/search`

| Parâmetro | Exemplo | Descrição |
|---|---|---|
| `limit` | `12` | Itens por página (padrão 12). `-1` retorna todos |
| `page` | `1` | Página (padrão 1). Ignorado com `limit=-1` |
| `fields` | `name,slug` | Campos retornados |
| `use_in_menu` | `true` | Filtra categorias exibidas no menu |

### Busca de produtos — `GET /v1/product/search`

| Parâmetro | Exemplo | Descrição |
|---|---|---|
| `limit` / `page` | `30` / `2` | Paginação (mesmas regras acima) |
| `fields` | `name,images,price` | Campos retornados (inclui `category_ids`, `images`, `options`) |
| `match` | `tênis` | Texto buscado no nome ou na descrição |
| `category_ids` | `15,24` | Produtos de qualquer uma das categorias |
| `price-range` | `100-200` | Faixa de preço (inclusiva) |
| `option[45]` | `GG,PP` | Produtos cuja opção 45 tenha algum dos valores |

Exemplo: `/v1/product/search?match=tênis&category_ids=1&price-range=100-200&fields=name,price`

### Criar produto — `POST /v1/product`

```json
{
  "enabled": true,
  "name": "Produto 01",
  "slug": "produto-01",
  "stock": 10,
  "description": "Descrição do produto 01",
  "price": 119.9,
  "price_with_discount": 99.9,
  "category_ids": [1, 2],
  "images": [{ "type": "image/png", "content": "<base64>" }],
  "options": [
    { "title": "Cor", "shape": "square", "radius": "4px", "type": "text", "values": ["PP", "GG", "M"] }
  ]
}
```

- Imagens chegam em base64, são salvas em `UPLOAD_DIR/products/<id>/` e servidas em
  `/media/...`. A API devolve a URL absoluta em `images[].content`.
- `radius` aceita número (`4`) ou texto (`"4px"`). `values` aceita lista ou texto
  separado por vírgula. O campo `value` também é aceito, como no exemplo do enunciado.

### Atualizar produto — `PUT /v1/product/:id`

Todos os campos são opcionais; apenas os enviados são alterados. Se `category_ids` vier,
ele substitui as categorias. Em `images` e `options`, cada item é tratado assim:

| Item | Efeito |
|---|---|
| sem `id` | cria uma nova imagem/opção |
| `{ "id": 1, "deleted": true }` | remove (o arquivo da imagem também é apagado) |
| `{ "id": 1, "content": "<url>" }` | mantém a imagem |
| `{ "id": 1, "type": "image/png", "content": "<base64>" }` | substitui o arquivo da imagem |
| `{ "id": 1, "radius": "10px", "values": [...] }` | atualiza só os campos enviados da opção |

Tudo roda em uma transação: se algum item for inválido, nada é alterado e os arquivos
novos são descartados.

## Modelagem do banco

```
users                 categories               products
-----                 ----------               --------
id (PK)               id (PK)                  id (PK)
firstname             name                     enabled
surname               slug (UNIQUE)            name
email (UNIQUE)        use_in_menu (INDEX)      slug (UNIQUE)
password (bcrypt)     created_at / updated_at  use_in_menu
created_at                                     stock
updated_at                                     description
                                               price (INDEX)
                                               price_with_discount
                                               created_at / updated_at

product_images            product_options              product_categories
--------------            ---------------              ------------------
id (PK)                   id (PK)                      product_id (PK, FK)
product_id (FK, INDEX)    product_id (FK, INDEX)       category_id (PK, FK, INDEX)
enabled                   title
path                      shape  ENUM(square, circle)
                          radius INTEGER
                          type   ENUM(text, color)
                          values "P,M,G"
```

- **products 1:N product_images** e **products 1:N product_options**
- **products N:N categories** pela tabela `product_categories`, com PK composta
- Todas as chaves estrangeiras usam `ON DELETE CASCADE`: remover um produto remove
  imagens, opções e vínculos; remover uma categoria remove apenas os vínculos.
- Há índices nas colunas usadas em filtros (`slug`, `email`, `price`, `use_in_menu`, FKs).
- Nas buscas, imagens e opções são carregadas em consultas separadas (`separate: true`).
  Isso evita o produto cartesiano dos JOINs e mantém a paginação correta.

## Decisões sobre pontos ambíguos do enunciado

- Token ausente ou inválido retorna **401**, como nas tabelas de cada endpoint.
- Cadastro (`POST /v1/user`) e login (`POST /v1/user/token`) não exigem token, já que
  o usuário ainda não tem um.
- Login com e-mail ou senha errados retorna **401**.
- Cadastro exige senha com no mínimo 6 caracteres, igual a `confirmPassword`. E-mails
  e slugs precisam ser únicos (**400** se repetidos).
- IDs inválidos na URL (ex.: `/v1/user/abc`) retornam **404**.
- `description` do produto usa `TEXT` para permitir descrições longas.
