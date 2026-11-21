const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

/** Tabela de ligação N:N entre produtos e categorias. */
const ProductCategory = sequelize.define(
  'ProductCategory',
  {
    product_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    category_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  },
  { tableName: 'product_categories', timestamps: false },
);

module.exports = ProductCategory;
