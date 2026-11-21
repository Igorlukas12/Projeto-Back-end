const v = require('../src/utils/validators');
const { parseOption, parseOptionFilters } = require('../src/services/productService');

describe('validators (unitário)', () => {
  test('parsePagination aplica padrões e limit=-1', () => {
    expect(v.parsePagination({})).toEqual({ limit: 12, page: 1, sql: { limit: 12, offset: 0 } });
    expect(v.parsePagination({ limit: '30', page: '2' }).sql).toEqual({ limit: 30, offset: 30 });
    expect(v.parsePagination({ limit: '-1', page: '3' }).sql).toEqual({});
    expect(() => v.parsePagination({ limit: '0' })).toThrow();
    expect(() => v.parsePagination({ page: '-2' })).toThrow();
  });

  test('parsePriceRange', () => {
    expect(v.parsePriceRange('100-200')).toEqual({ min: 100, max: 200 });
    expect(v.parsePriceRange('9.5-10')).toEqual({ min: 9.5, max: 10 });
    expect(() => v.parsePriceRange('200-100')).toThrow();
    expect(() => v.parsePriceRange('cem')).toThrow();
  });

  test('parseFields valida contra lista permitida', () => {
    expect(v.parseFields('name, slug', ['name', 'slug'])).toEqual(['name', 'slug']);
    expect(v.parseFields(undefined, ['name'])).toBeNull();
    expect(() => v.parseFields('password', ['name'])).toThrow();
  });

  test('parseIntList e parseId', () => {
    expect(v.parseIntList('15,24,15', 'x')).toEqual([15, 24]);
    expect(() => v.parseIntList('a', 'x')).toThrow();
    expect(v.parseId('7')).toBe(7);
    expect(() => v.parseId('abc')).toThrow(expect.objectContaining({ status: 404 }));
  });
});

describe('opções de produto (unitário)', () => {
  test('parseOption normaliza radius e values/value', () => {
    expect(parseOption({ title: 'Cor', radius: '4px', value: ['PP', ' GG '] })).toEqual({
      title: 'Cor',
      radius: 4,
      values: 'PP,GG',
    });
    expect(parseOption({ radius: 10 }, true)).toEqual({ radius: 10 });
    expect(() => parseOption({ title: 'Cor', values: [] })).toThrow();
    expect(() => parseOption({ title: 'Cor', values: ['A'], type: 'img' })).toThrow();
  });

  test('parseOptionFilters entende option[ID] nos dois formatos de query', () => {
    expect(parseOptionFilters({ 'option[45]': 'GG,PP' })).toEqual([{ optionId: 45, values: ['GG', 'PP'] }]);
    expect(parseOptionFilters({ option: { 7: 'M' } })).toEqual([{ optionId: 7, values: ['M'] }]);
  });
});
