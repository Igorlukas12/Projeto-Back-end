/**
 * Instância única do Sequelize compartilhada por toda a aplicação.
 */
const { Sequelize } = require('sequelize');
const configs = require('./database');

const env = process.env.NODE_ENV || 'development';

module.exports = new Sequelize(configs[env]);
