const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

/**
 * Usuário do sistema. A senha é sempre armazenada como hash (bcrypt).
 * O defaultScope remove a senha das consultas; use o scope "withPassword" no login.
 */
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    firstname: { type: DataTypes.STRING, allowNull: false },
    surname: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
  },
  {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: { include: ['password'] } } },
  },
);

module.exports = User;
