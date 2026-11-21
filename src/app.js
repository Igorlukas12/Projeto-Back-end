/**
 * Configuração do Express (sem subir o servidor), para poder ser usado nos testes.
 */
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { uploadDir } = require('./config/env');
const swaggerSpec = require('./docs/swagger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Limite maior para suportar imagens em base64 no corpo da requisição
app.use(express.json({ limit: '10mb' }));

// Arquivos de imagens dos produtos
app.use('/media', express.static(uploadDir));

// Documentação da API
app.get('/docs.json', (req, res) => res.json(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => res.json({ status: 'ok', docs: '/docs' }));
app.use('/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
