/**
 * Ponto de entrada: conecta no banco e sobe o servidor HTTP.
 */
const app = require('./app');
const { port } = require('./config/env');
const { sequelize } = require('./models');

async function start() {
  try {
    await sequelize.authenticate();
    app.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}`);
      console.log(`Documentação em http://localhost:${port}/docs`);
    });
  } catch (err) {
    console.error('Não foi possível conectar ao banco de dados:', err.message);
    process.exit(1);
  }
}

start();
