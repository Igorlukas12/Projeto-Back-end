'use strict';

/** Cria a tabela de imagens dos produtos. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_images', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      path: { type: Sequelize.STRING, allowNull: false },
    });
    await queryInterface.addIndex('product_images', ['product_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_images');
  },
};
