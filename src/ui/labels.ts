import type { Category } from '../skills/types';

export const CATEGORY_LABELS: Record<Category, string> = {
  tricks: 'Quick tricks',
  addsub: 'Adding & subtracting',
  percent: 'Percentages',
  multiply: 'Multiplication',
  divide: 'Division & fractions',
  estimate: 'Estimation',
  extras: 'Fun extras',
};

export const CATEGORY_ORDER: Category[] = ['tricks', 'addsub', 'percent', 'multiply', 'divide', 'estimate', 'extras'];
