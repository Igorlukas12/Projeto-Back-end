'use strict';

const bcrypt = require('bcrypt');

/**
 * Dados de exemplo: um usuário (admin@example.com / 123456), categorias e um produto.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        firstname: 'Admin',
        surname: 'Demo',
        email: 'admin@example.com',
        password: await bcrypt.hash('123456', 10),
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('categories', [
      { name: 'Camisetas', slug: 'camisetas', use_in_menu: true, created_at: now, updated_at: now },
      { name: 'Calçados', slug: 'calcados', use_in_menu: true, created_at: now, updated_at: now },
      { name: 'Promoções', slug: 'promocoes', use_in_menu: false, created_at: now, updated_at: now },
    ]);

    const [categories] = await queryInterface.sequelize.query(
      "SELECT id FROM categories WHERE slug IN ('camisetas', 'promocoes')",
    );

    await queryInterface.bulkInsert('products', [
      {
        enabled: true,
        name: 'Camiseta Básica',
        slug: 'camiseta-basica',
        use_in_menu: false,
        stock: 50,
        description: 'Camiseta 100% algodão.',
        price: 79.9,
        price_with_discount: 59.9,
        created_at: now,
        updated_at: now,
      },
    ]);

    const [[product]] = await queryInterface.sequelize.query(
      "SELECT id FROM products WHERE slug = 'camiseta-basica'",
    );

    await queryInterface.bulkInsert(
      'product_categories',
      categories.map((c) => ({ product_id: product.id, category_id: c.id })),
    );

    await queryInterface.bulkInsert('product_options', [
      { product_id: product.id, title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: 'P,M,G,GG' },
      { product_id: product.id, title: 'Cor', shape: 'circle', radius: 0, type: 'color', values: '#000000,#FFFFFF' },
    ]);
  },

  async down(queryInterface) {
    // A ordem respeita as chaves estrangeiras (cascade remove imagens/opções/ligações)
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
