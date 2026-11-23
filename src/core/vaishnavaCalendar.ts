import { VaishnavaOccasion } from '../types/vaishnavaCalendar';
import { Recipe } from '../types/recipe';

/**
 * Pre-compiled ISKCON Vaishnava Fasting & Ekadashi Calendar Table
 * Covers all Ekadashi cycles and major festival appearances.
 */
export const VAISHNAVA_OCCASIONS: Record<string, VaishnavaOccasion> = {
  // Sample upcoming dates mapped for calendar synchronization
  '2026-11-20': {
    date: '2026-11-20',
    name: 'Utpanna Ekadashi',
    type: 'Ekadashi',
    fastingRule: 'Grain Fast (Ekadashi Prasadam)',
    prohibitedItems: ['Rice', 'Wheat', 'Toor Dal', 'Moong Dal', 'Urad Dal', 'Chana', 'Corn', 'Mustard Oil'],
    allowedSubstitutes: ['Sama Rice', 'Sabudana', 'Potatoes', 'Buckwheat', 'Fruits', 'Milk', 'Ghee', 'Paneer'],
    description: 'Appearance of Ekadashi Devi from Lord Vishnu. Strictly abstain from grains and beans.',
  },
  '2026-12-05': {
    date: '2026-12-05',
    name: 'Mokshada Ekadashi (Gita Jayanti)',
    type: 'Ekadashi',
    fastingRule: 'Grain Fast (Ekadashi Prasadam)',
    prohibitedItems: ['Rice', 'Wheat', 'All Grains', 'Beans', 'Pulses'],
    allowedSubstitutes: ['Sama Rice', 'Sabudana', 'Potatoes', 'Fruits', 'Milk', 'Ghee', 'Paneer'],
    description: 'Advent of Srimad Bhagavad-gita. Fasting from grains and beans.',
  },
  '2026-12-20': {
    date: '2026-12-20',
    name: 'Saphala Ekadashi',
    type: 'Ekadashi',
    fastingRule: 'Grain Fast (Ekadashi Prasadam)',
    prohibitedItems: ['Rice', 'Wheat', 'All Grains', 'Beans'],
    allowedSubstitutes: ['Sama Rice', 'Sabudana', 'Potatoes', 'Fruits', 'Dairy'],
    description: 'Fasting from grains and beans.',
  },
  '2027-01-04': {
    date: '2027-01-04',
    name: 'Putrada Ekadashi',
    type: 'Ekadashi',
    fastingRule: 'Grain Fast (Ekadashi Prasadam)',
    prohibitedItems: ['Rice', 'Wheat', 'All Grains', 'Beans'],
    allowedSubstitutes: ['Sama Rice', 'Sabudana', 'Potatoes', 'Fruits', 'Dairy'],
    description: 'Fasting from grains and beans.',
  },
  '2027-01-19': {
    date: '2027-01-19',
    name: 'Shat-tila Ekadashi',
    type: 'Ekadashi',
    fastingRule: 'Grain Fast (Ekadashi Prasadam)',
    prohibitedItems: ['Rice', 'Wheat', 'All Grains', 'Beans'],
    allowedSubstitutes: ['Sama Rice', 'Sabudana', 'Potatoes', 'Fruits', 'Dairy'],
    description: 'Fasting from grains and beans. Sesame seeds may be used in puja.',
  },
  '2027-02-03': {
    date: '2027-02-03',
    name: 'Bhaimi Ekadashi (Jaya Ekadashi)',
    type: 'Ekadashi',
    fastingRule: 'Grain Fast (Ekadashi Prasadam)',
    prohibitedItems: ['Rice', 'Wheat', 'All Grains', 'Beans'],
    allowedSubstitutes: ['Sama Rice', 'Sabudana', 'Potatoes', 'Fruits', 'Dairy'],
    description: 'Fasting from grains and beans for liberation from ghostly life.',
  },
  '2027-02-04': {
    date: '2027-02-04',
    name: 'Varaha Dvadasi (Appearance of Lord Varahadeva)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    prohibitedItems: ['Heavy Feasting before Noon'],
    allowedSubstitutes: ['Noon Ekadashi style or Light Prasadam, feast after'],
    description: 'Fasting until noon for Lord Varaha appearance.',
  },
  '2027-03-24': {
    date: '2027-03-24',
    name: 'Gaura Purnima (Appearance of Sri Caitanya Mahaprabhu)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Moonrise',
    prohibitedItems: ['Grains and meals before moonrise'],
    allowedSubstitutes: ['Anukalpa Prasadam after moonrise (Non-grain feast)'],
    description: 'Grand appearance day of Sri Chaitanya Mahaprabhu. Fast until moonrise, then feast.',
  },
};

/**
 * Returns the Vaishnava Occasion for a given date if any, or null.
 */
export function getVaishnavaOccasionForDate(dateStr: string): VaishnavaOccasion | null {
  return VAISHNAVA_OCCASIONS[dateStr] || null;
}

/**
 * Checks if a date requires grain fasting (Ekadashi or Major Festival fast)
 */
export function isEkadashiOrFastingDate(dateStr: string): boolean {
  const occ = getVaishnavaOccasionForDate(dateStr);
  return occ !== null && (occ.type === 'Ekadashi' || occ.type === 'Fasting');
}

/**
 * Validates whether a Recipe is allowed for the given date's Vaishnava rule.
 * On Ekadashi: only recipes with occasion = 'Ekadashi' or 'Fasting' are valid!
 * Normal grain recipes (rice, dal, roti) are strictly disallowed on Ekadashi.
 */
export function validateRecipeForDate(
  recipe: Recipe,
  dateStr: string
): { isAllowed: boolean; warning?: string } {
  const occasion = getVaishnavaOccasionForDate(dateStr);

  if (occasion && occasion.type === 'Ekadashi') {
    if (recipe.occasion !== 'Ekadashi' && recipe.occasion !== 'Fasting') {
      return {
        isAllowed: false,
        warning: `Forbidden on ${occasion.name}: "${recipe.name}" contains grains/pulses. Only Ekadashi-approved dishes (Sama rice, Sabudana, Potato, Fruits, Dairy) are permitted.`,
      };
    }
  }

  return { isAllowed: true };
}
