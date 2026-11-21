/**
 * Ponto central dos models: importa todos e define os relacionamentos.
 */
const sequelize = require('../config/sequelize');
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const ProductOption = require('./ProductOption');
const ProductCategory = require('./ProductCategory');

// Produto 1:N Imagens
Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });

// Produto 1:N Opções
Product.hasMany(ProductOption, { as: 'options', foreignKey: 'product_id', onDelete: 'CASCADE' });
ProductOption.belongsTo(Product, { as: 'product', foreignKey: 'product_id' });

// Produto N:N Categorias
Product.belongsToMany(Category, {
  as: 'categories',
  through: ProductCategory,
  foreignKey: 'product_id',
  otherKey: 'category_id',
});
Category.belongsToMany(Product, {
  as: 'products',
  through: ProductCategory,
  foreignKey: 'category_id',
  otherKey: 'product_id',
});

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
};
