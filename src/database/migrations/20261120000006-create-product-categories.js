'use strict';

/** Cria a tabela de ligação produto <-> categoria (N:N). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_categories', {
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });
    // A PK composta já indexa (product_id, category_id); este índice acelera o filtro por categoria.
    await queryInterface.addIndex('product_categories', ['category_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_categories');
  },
};
