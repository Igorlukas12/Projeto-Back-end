/**
 * Configuração de conexão por ambiente.
 * Usada tanto pela aplicação quanto pelo sequelize-cli (migrations/seeders).
 */
require('dotenv').config();

// Padrões aplicados a todos os models: colunas created_at / updated_at
const define = {
  underscored: true,
  timestamps: true,
};

const mysql = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'projeto_backend',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: false,
  define,
};

module.exports = {
  development: mysql,
  production: mysql,
  // Os testes automatizados rodam em SQLite em memória, sem depender de um MySQL.
  test: {
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || ':memory:',
    logging: false,
    define,
  },
};
