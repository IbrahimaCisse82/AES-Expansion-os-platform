import { describe, it, expect } from 'vitest';
import { rowsToObjects } from './spreadsheet';

describe('rowsToObjects', () => {
  it('indexe chaque ligne par les en-têtes de la première ligne', () => {
    const rows = [
      ['Catégorie', 'Marché', 'Jan', 'Fév'],
      ['Salaires', 'Sénégal', 1000, 2000],
    ];
    expect(rowsToObjects(rows)).toEqual([
      { Catégorie: 'Salaires', Marché: 'Sénégal', Jan: 1000, Fév: 2000 },
    ]);
  });

  it('ignore les lignes vides et les cellules vides', () => {
    const rows = [
      ['A', 'B'],
      [null, null],
      ['x', null],
      ['', ''],
    ];
    expect(rowsToObjects(rows)).toEqual([{ A: 'x' }]);
  });

  it('ignore les colonnes sans en-tête et nettoie les espaces', () => {
    expect(rowsToObjects([[' A ', null], [1, 2]])).toEqual([{ A: 1 }]);
  });

  it('renvoie un tableau vide pour une feuille vide', () => {
    expect(rowsToObjects([])).toEqual([]);
  });
});
