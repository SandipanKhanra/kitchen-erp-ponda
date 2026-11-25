import rawEvents from '../data/iskconChowpattyEvents.json';
import { VaishnavaOccasion } from '../types/vaishnavaCalendar';

export const ISKCON_CHOWPATTY_CALENDAR = {
  calendarId:
    'c_39ebfe127151f403cca78e55e34cf4a1cbfd05c35ff2bdd3d5da5a14d4a67a91@group.calendar.google.com',
  timezone: 'Asia/Kolkata',
  embedUrl:
    'https://calendar.google.com/calendar/embed?src=c_39ebfe127151f403cca78e55e34cf4a1cbfd05c35ff2bdd3d5da5a14d4a67a91%40group.calendar.google.com&ctz=Asia%2FKolkata',
  addToCalendarUrl:
    'https://calendar.google.com/calendar/r?cid=c_39ebfe127151f403cca78e55e34cf4a1cbfd05c35ff2bdd3d5da5a14d4a67a91%40group.calendar.google.com',
  icsUrl:
    'https://calendar.google.com/calendar/ical/c_39ebfe127151f403cca78e55e34cf4a1cbfd05c35ff2bdd3d5da5a14d4a67a91%40group.calendar.google.com/public/basic.ics',
  sourcePageUrl: 'https://iskconchowpatty.com/vaishnava-calendar',
};

interface RawChowpattyEvent {
  date: string;
  name: string;
  type: 'Ekadashi' | 'Fasting' | 'Festival';
  description?: string;
  paranaWindow?: string;
}

function mapRawToOccasion(ev: RawChowpattyEvent): VaishnavaOccasion {
  const isEkadashi = ev.type === 'Ekadashi';
  const isFasting = ev.type === 'Fasting';

  const lower = ev.name.toLowerCase();
  const fastingRule: VaishnavaOccasion['fastingRule'] = isEkadashi
    ? 'Grain Fast (Ekadashi Prasadam)'
    : isFasting
    ? lower.includes('nrsimha') || lower.includes('narasimha') || lower.includes('janmastami') || lower.includes('janmashtami')
      ? 'Full Fast until Sunset'
      : lower.includes('gaura purnima')
      ? 'Full Fast until Moonrise'
      : 'Full Fast until Noon'
    : 'Feast';

  return {
    date: ev.date,
    name: ev.name,
    type: ev.type,
    fastingRule,
    prohibitedItems: isEkadashi
      ? ['Rice', 'Wheat', 'All Grains', 'Beans', 'Mustard Oil']
      : isFasting
      ? ['Grains during fasting hours']
      : [],
    allowedSubstitutes: isEkadashi
      ? ['Sama Rice', 'Sabudana', 'Potatoes', 'Fruits', 'Milk', 'Ghee', 'Paneer']
      : ['Prasadam as per temple schedule'],
    description:
      ev.description ||
      `${ev.name} — synced from ISKCON Chowpatty Google Calendar (Asia/Kolkata).`,
    paranaWindow: ev.paranaWindow,
    source: 'ics-sync',
  };
}

const allChowpattyOccasions: VaishnavaOccasion[] = (rawEvents as RawChowpattyEvent[]).map(
  mapRawToOccasion
);

/**
 * Returns ISKCON Chowpatty Google Calendar occasions for the given year (2025-2030),
 * or an empty array if the year is outside the feed range.
 */
export function getChowpattyCalendarForYear(year: number): VaishnavaOccasion[] {
  const prefix = `${year}-`;
  return allChowpattyOccasions.filter((occ) => occ.date.startsWith(prefix));
}
