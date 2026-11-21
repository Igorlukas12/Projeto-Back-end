const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

/**
 * Opção de um produto (ex.: Tamanho, Cor).
 * "values" guarda os valores separados por vírgula, ex.: "P,M,G".
 */
const ProductOption = sequelize.define(
  'ProductOption',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    shape: { type: DataTypes.ENUM('square', 'circle'), allowNull: false, defaultValue: 'square' },
    radius: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.ENUM('text', 'color'), allowNull: false, defaultValue: 'text' },
    values: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: 'product_options', timestamps: false },
);

module.exports = ProductOption;
