import {
  computeEkadashiDatesForYear,
  getDailyPanchang,
} from 'panchang-ts';
import { Center } from '../types/center';
import { CenterLocation, VaishnavaOccasion } from '../types/vaishnavaCalendar';

/**
 * Known ISKCON Center city coordinates for automatic location resolution
 * when explicit lat/lon are not yet saved on the Center document.
 */
const CITY_COORDINATES: Record<string, CenterLocation> = {
  ponda: { latitude: 15.402, longitude: 74.005, timezone: 'Asia/Kolkata', label: 'Ponda, Goa' },
  panaji: { latitude: 15.4909, longitude: 73.8278, timezone: 'Asia/Kolkata', label: 'Panaji, Goa' },
  margao: { latitude: 15.2832, longitude: 73.9862, timezone: 'Asia/Kolkata', label: 'Margao, Goa' },
  goa: { latitude: 15.402, longitude: 74.005, timezone: 'Asia/Kolkata', label: 'Goa, India' },
  mumbai: { latitude: 19.1136, longitude: 72.8261, timezone: 'Asia/Kolkata', label: 'Juhu, Mumbai' },
  pune: { latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata', label: 'Pune, Maharashtra' },
  vrindavan: { latitude: 27.5719, longitude: 77.6778, timezone: 'Asia/Kolkata', label: 'Vrindavan, UP' },
  mayapur: { latitude: 23.4233, longitude: 88.3883, timezone: 'Asia/Kolkata', label: 'Sri Mayapur Dham, WB' },
  kolkata: { latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata', label: 'Kolkata, WB' },
  bangalore: { latitude: 13.0098, longitude: 77.5511, timezone: 'Asia/Kolkata', label: 'Bengaluru, Karnataka' },
  bengaluru: { latitude: 13.0098, longitude: 77.5511, timezone: 'Asia/Kolkata', label: 'Bengaluru, Karnataka' },
  delhi: { latitude: 28.5553, longitude: 77.2536, timezone: 'Asia/Kolkata', label: 'New Delhi' },
  hyderabad: { latitude: 17.385, longitude: 78.4867, timezone: 'Asia/Kolkata', label: 'Hyderabad, Telangana' },
  chennai: { latitude: 12.9063, longitude: 80.2435, timezone: 'Asia/Kolkata', label: 'Chennai, TN' },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714, timezone: 'Asia/Kolkata', label: 'Ahmedabad, Gujarat' },
  surat: { latitude: 21.1702, longitude: 72.8311, timezone: 'Asia/Kolkata', label: 'Surat, Gujarat' },
  jaipur: { latitude: 26.8622, longitude: 75.7745, timezone: 'Asia/Kolkata', label: 'Jaipur, Rajasthan' },
  london: { latitude: 51.5194, longitude: -0.1369, timezone: 'Europe/London', label: 'London, UK' },
  'new york': { latitude: 40.7276, longitude: -74.0005, timezone: 'America/New_York', label: 'New York, USA' },
};

export const DEFAULT_CENTER_LOCATION: CenterLocation = CITY_COORDINATES.ponda;

/**
 * Resolves geographic coordinates & timezone for a given Center.
 */
export function resolveCenterLocation(center?: Partial<Center> | null): CenterLocation {
  if (
    center &&
    typeof center.latitude === 'number' &&
    typeof center.longitude === 'number' &&
    center.timezone
  ) {
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      timezone: center.timezone,
      label: center.city ? `${center.city}, ${center.state || center.country || ''}`.trim() : center.name,
    };
  }

  const cityKey = (center?.city || '').trim().toLowerCase();
  if (cityKey && CITY_COORDINATES[cityKey]) {
    return CITY_COORDINATES[cityKey];
  }

  const nameLower = (center?.name || '').toLowerCase();
  for (const [key, loc] of Object.entries(CITY_COORDINATES)) {
    if (nameLower.includes(key)) return loc;
  }

  return DEFAULT_CENTER_LOCATION;
}

function formatLocalTime(localIso?: string | null): string {
  if (!localIso) return '';
  const match = localIso.match(/T(\d{2}):(\d{2})/);
  if (!match) return '';
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
}

function addMinutesToLocalTime(localIso: string, minutesToAdd: number): string {
  const match = localIso.match(/T(\d{2}):(\d{2})/);
  if (!match) return '';
  const baseMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10) + Math.round(minutesToAdd);
  const wrapped = ((baseMins % 1440) + 1440) % 1440;
  let hour = Math.floor(wrapped / 60);
  const minute = String(wrapped % 60).padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
}

function toISODateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EKADASHI_BY_MASA_PAKSHA: Record<string, string> = {
  'Chaitra_Shukla': 'Kamada Ekadashi',
  'Chaitra_Krishna': 'Papamocani Ekadashi',
  'Vaishakha_Shukla': 'Mohini Ekadashi',
  'Vaishakha_Krishna': 'Varuthini Ekadashi',
  'Jyeshtha_Shukla': 'Pandava Nirjala Ekadashi',
  'Jyeshtha_Krishna': 'Apara Ekadashi',
  'Ashadha_Shukla': 'Sayana Ekadashi',
  'Ashadha_Krishna': 'Yogini Ekadashi',
  'Shravana_Shukla': 'Pavitropana Ekadashi',
  'Shravana_Krishna': 'Kamika Ekadashi',
  'Bhadrapada_Shukla': 'Parsva Ekadashi',
  'Bhadrapada_Krishna': 'Annada (Aja) Ekadashi',
  'Ashwin_Shukla': 'Pasankusa Ekadashi',
  'Ashwin_Krishna': 'Indira Ekadashi',
  'Ashvina_Shukla': 'Pasankusa Ekadashi',
  'Ashvina_Krishna': 'Indira Ekadashi',
  'Kartika_Shukla': 'Utthana (Prabodhini) Ekadashi',
  'Kartika_Krishna': 'Rama Ekadashi',
  'Margashirsha_Shukla': 'Mokshada Ekadashi',
  'Margashirsha_Krishna': 'Utpanna Ekadashi',
  'Pausha_Shukla': 'Putrada Ekadashi',
  'Pausha_Krishna': 'Saphala Ekadashi',
  'Magha_Shukla': 'Bhaimi (Jaya) Ekadashi',
  'Magha_Krishna': 'Shat-tila Ekadashi',
  'Phalguna_Shukla': 'Amalaki Ekadashi',
  'Phalguna_Krishna': 'Vijaya Ekadashi',
};

interface IskconSpecialDayRule {
  name: string;
  type: 'Fasting' | 'Festival';
  fastingRule: VaishnavaOccasion['fastingRule'];
  description: string;
}

/**
 * Curated ISKCON Vaishnava Occasions & Acarya Appearance/Disappearance Days
 * keyed by `${PurnimantaMasa}_${Paksha}_${TithiNumber}`.
 * Strictly excludes non-ISKCON monthly vrats (such as Masik Shivaratri, Sankashti, Pradosha).
 */
const ISKCON_SPECIAL_DAYS: Record<string, IskconSpecialDayRule> = {
  // Chaitra (Vishnu)
  'Chaitra_Shukla_5': {
    name: 'Sri Ramanujacharya Appearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Appearance day of Sri Ramanujacharya, principal acarya of the Sri Sampradaya.',
  },
  'Chaitra_Shukla_9': {
    name: 'Sri Rama Navami (Appearance of Lord Ramachandra)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Sunset',
    description: 'Appearance day of Lord Sri Ramachandra. Fast until sunset, followed by Anukalpa/feast.',
  },

  // Vaishakha (Madhusudana)
  'Vaishakha_Shukla_9': {
    name: 'Sita Navami (Appearance of Srimati Sita Devi)',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Appearance day of Srimati Sita Devi, eternal consort of Lord Ramachandra.',
  },
  'Vaishakha_Shukla_14': {
    name: 'Nrsimha Chaturdashi (Appearance of Lord Nrsimhadeva)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Sunset',
    description: 'Appearance day of Lord Nrsimhadeva. Fast until dusk/sunset, then break fast with Ekadashi-style prasadam.',
  },

  // Jyeshtha (Trivikrama)
  'Jyeshtha_Shukla_15': {
    name: 'Snana Yatra of Lord Jagannatha',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Grand bathing ceremony of Lord Jagannatha, Baladeva, and Subhadra Devi.',
  },

  // Ashadha (Vamana)
  'Ashadha_Shukla_2': {
    name: 'Sri Jagannatha Ratha Yatra',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Chariot festival of Lord Jagannatha, Baladeva, and Subhadra Devi.',
  },
  'Ashadha_Shukla_15': {
    name: 'Guru Purnima & Srila Sanatana Goswami Disappearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Vyasa Puja / Guru Purnima and disappearance day of Srila Sanatana Goswami.',
  },
  'Ashadha_Krishna_15': {
    name: 'Srila Bhaktivinoda Thakura Disappearance',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Disappearance day of Srila Bhaktivinoda Thakura. Fast until noon, followed by feast.',
  },

  // Shravana (Sridhara)
  'Shravana_Shukla_12': {
    name: 'Srila Rupa Goswami Disappearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Disappearance day of Srila Rupa Goswami, leader of the Six Goswamis of Vrindavan.',
  },
  'Shravana_Shukla_15': {
    name: 'Balarama Purnima (Appearance of Lord Balarama)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Lord Balarama. Fast until noon, followed by feast.',
  },

  // Bhadrapada (Hrsikesa)
  'Bhadrapada_Krishna_8': {
    name: 'Sri Krishna Janmashtami (Appearance of Lord Krishna)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Moonrise',
    description: 'Supreme appearance day of Lord Sri Krishna. Fast until midnight, followed by Ekadashi-style prasadam.',
  },
  'Bhadrapada_Krishna_9': {
    name: 'Nandotsava & Srila Prabhupada Appearance Day',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Vyasa Puja — Appearance day of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada (Founder-Acarya of ISKCON). Fast until noon.',
  },
  'Bhadrapada_Shukla_8': {
    name: 'Radhashtami (Appearance of Srimati Radharani)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Srimati Radharani. Fast until noon, followed by grand feast.',
  },
  'Bhadrapada_Shukla_12': {
    name: 'Vamana Dvadashi (Appearance of Lord Vamanadeva)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Lord Vamanadeva and Srila Jiva Goswami Appearance.',
  },
  'Bhadrapada_Shukla_13': {
    name: 'Srila Bhaktivinoda Thakura Appearance',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Srila Bhaktivinoda Thakura. Fast until noon.',
  },

  // Ashwin / Ashvina (Padmanabha)
  'Ashwin_Shukla_10': {
    name: 'Vijayadashami & Srila Madhvacarya Appearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Victory of Lord Ramachandra and appearance day of Srila Madhvacarya.',
  },
  'Ashvina_Shukla_10': {
    name: 'Vijayadashami & Srila Madhvacarya Appearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Victory of Lord Ramachandra and appearance day of Srila Madhvacarya.',
  },
  'Ashwin_Shukla_12': {
    name: 'Srila Raghunatha Dasa & Krishnadasa Kaviraja Goswami Disappearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Disappearance day of Srila Raghunatha Dasa Goswami, Srila Raghunatha Bhatta Goswami, and Srila Krishnadasa Kaviraja Goswami.',
  },
  'Ashvina_Shukla_12': {
    name: 'Srila Raghunatha Dasa & Krishnadasa Kaviraja Goswami Disappearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Disappearance day of Srila Raghunatha Dasa Goswami, Srila Raghunatha Bhatta Goswami, and Srila Krishnadasa Kaviraja Goswami.',
  },

  // Kartika (Damodara)
  'Kartika_Krishna_5': {
    name: 'Srila Narottama Dasa Thakura Disappearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Disappearance day of Srila Narottama Dasa Thakura.',
  },
  'Kartika_Shukla_1': {
    name: 'Govardhana Puja (Annakuta Festival)',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Worship of Govardhana Hill and grand Annakuta feast.',
  },
  'Kartika_Shukla_4': {
    name: 'Srila Prabhupada Disappearance Day',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Disappearance day of His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. Fast until noon, followed by feast.',
  },

  // Pausha (Narayana)
  'Pausha_Krishna_4': {
    name: 'Srila Bhaktisiddhanta Sarasvati Thakura Disappearance',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Disappearance day of Srila Bhaktisiddhanta Sarasvati Thakura Prabhupada. Fast until noon.',
  },
  'Pausha_Shukla_3': {
    name: 'Srila Jiva Goswami Disappearance',
    type: 'Festival',
    fastingRule: 'Feast',
    description: 'Disappearance day of Srila Jiva Goswami.',
  },

  // Magha (Madhava)
  'Magha_Krishna_5': {
    name: 'Srila Bhaktisiddhanta Sarasvati Thakura Appearance',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Srila Bhaktisiddhanta Sarasvati Thakura Prabhupada. Fast until noon.',
  },
  'Magha_Shukla_7': {
    name: 'Sri Advaita Acharya Appearance',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Sri Advaita Acharya. Fast until noon, followed by feast.',
  },
  'Magha_Shukla_12': {
    name: 'Varaha Dvadashi (Appearance of Lord Varahadeva)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Lord Varahadeva. Fast until noon, followed by feast.',
  },
  'Magha_Shukla_13': {
    name: 'Nityananda Trayodashi (Appearance of Lord Nityananda)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Noon',
    description: 'Appearance day of Lord Nityananda Prabhu. Fast until noon, followed by grand feast.',
  },

  // Phalguna (Govinda)
  'Phalguna_Shukla_15': {
    name: 'Gaura Purnima (Appearance of Sri Chaitanya Mahaprabhu)',
    type: 'Fasting',
    fastingRule: 'Full Fast until Moonrise',
    description: 'Grand appearance day of Sri Chaitanya Mahaprabhu. Fast until moonrise, followed by Anukalpa feast.',
  },
};

/**
 * Computes all Ekadashis, Vaishnava Acaryas Appearance/Disappearance days,
 * and Main ISKCON Vaishnava Occasions for a full year at the Center's exact location.
 */
export function computeVaishnavaYearCalendar(
  year: number,
  location: CenterLocation
): VaishnavaOccasion[] {
  const geo = { latitude: location.latitude, longitude: location.longitude };
  const opts = { timezone: location.timezone };
  const occasionsMap = new Map<string, VaishnavaOccasion>();

  try {
    // 1. Compute all Ekadashis for the year at this location
    const ekadashiDates = computeEkadashiDatesForYear(year, geo, opts);

    for (const dateObj of ekadashiDates) {
      const dateStr = toISODateString(dateObj);
      const noonSample = new Date(`${dateStr}T06:00:00Z`);
      const daily = getDailyPanchang(noonSample, geo, opts);

      const sunriseLocal = formatLocalTime(daily?.sun?.riseLocal);
      const chandramasa =
        daily?.calendar?.chandramasa?.purnimantaName ||
        daily?.calendar?.chandramasa?.name ||
        '';
      const activeTithi =
        daily?.angas?.tithis?.find((t: any) => t.number === 11) ||
        daily?.angas?.tithis?.find((t: any) => t.isActiveAtSunrise) ||
        daily?.angas?.tithis?.[0];
      const paksha = activeTithi?.paksha || '';

      const festEkadashi = daily?.festivals?.find(
        (f: any) => f.key === 'ekadashi' || f.key === 'smarta_ekadashi'
      );
      const lookupName = EKADASHI_BY_MASA_PAKSHA[`${chandramasa}_${paksha}`];
      const ekadashiName =
        (festEkadashi?.description && festEkadashi.description.includes('Ekadashi')
          ? festEkadashi.description
          : lookupName) || `${paksha} Ekadashi (${chandramasa})`;

      // Parana (break-fast) window on Dvadashi (next day)
      const nextDay = new Date(noonSample.getTime() + 24 * 60 * 60 * 1000);
      const nextDaily = getDailyPanchang(nextDay, geo, opts);
      const nextSunriseLocal = nextDaily?.sun?.riseLocal;
      const dvadashiTithi = nextDaily?.angas?.tithis?.find((t: any) => t.number === 12);

      let paranaWindow = '';
      if (nextSunriseLocal) {
        const startStr = formatLocalTime(nextSunriseLocal);
        const dayDurationMins = nextDaily?.sun?.dayDurationMinutes || 720;
        const maxParanaMins = Math.round(dayDurationMins / 3);
        let endStr = addMinutesToLocalTime(nextSunriseLocal, maxParanaMins);

        if (dvadashiTithi?.endTime && nextDaily?.sun?.rise) {
          const dvadashiEndMs = new Date(dvadashiTithi.endTime).getTime();
          const riseMs = new Date(nextDaily.sun.rise).getTime();
          const diffMins = (dvadashiEndMs - riseMs) / 60000;
          if (diffMins > 0 && diffMins < maxParanaMins) {
            endStr = formatLocalTime(dvadashiTithi.endTimeLocal);
          }
        }
        paranaWindow = `${startStr} – ${endStr} (Next Day)`;
      }

      occasionsMap.set(dateStr, {
        date: dateStr,
        name: ekadashiName,
        type: 'Ekadashi',
        fastingRule: 'Grain Fast (Ekadashi Prasadam)',
        prohibitedItems: ['Rice', 'Wheat', 'Toor Dal', 'Moong Dal', 'Urad Dal', 'Chana', 'Beans', 'Mustard Oil'],
        allowedSubstitutes: ['Sama Rice', 'Sabudana', 'Potatoes', 'Buckwheat (Kuttu)', 'Fruits', 'Milk', 'Ghee', 'Paneer'],
        description: `Vaishnava ${ekadashiName} (${paksha} Paksha, ${chandramasa} Masa) calculated for ${location.label || location.timezone}. Strictly abstain from grains and beans.`,
        sunriseLocal,
        paranaWindow,
        masa: chandramasa,
        paksha,
        source: 'gaurabda-engine',
      });
    }

    // 2. Scan year's daily sunrise tithis for ISKCON Main Occasions & Acarya Appearance/Disappearance Days
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDays = isLeap ? 366 : 365;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(Date.UTC(year, 0, 1 + i, 6, 0, 0));
      const dateStr = toISODateString(d);
      if (occasionsMap.has(dateStr)) continue; // Ekadashi takes precedence on the date

      const daily = getDailyPanchang(d, geo, opts);
      if (!daily) continue;

      const masa =
        daily.calendar?.chandramasa?.purnimantaName ||
        daily.calendar?.chandramasa?.name ||
        '';
      const sunriseTithi =
        daily.angas?.tithis?.find((t: any) => t.isActiveAtSunrise) ||
        daily.angas?.tithis?.[0];

      if (!masa || !sunriseTithi) continue;

      const key = `${masa}_${sunriseTithi.paksha}_${sunriseTithi.number}`;
      const rule = ISKCON_SPECIAL_DAYS[key];
      if (!rule) continue;

      const sunriseLocal = formatLocalTime(daily.sun?.riseLocal);
      const isFast = rule.type === 'Fasting';

      occasionsMap.set(dateStr, {
        date: dateStr,
        name: rule.name,
        type: rule.type,
        fastingRule: rule.fastingRule,
        prohibitedItems: isFast ? ['Grains during fasting hours'] : [],
        allowedSubstitutes: isFast
          ? ['Anukalpa Prasadam (Fruits, Milk, Sabudana, Sama Rice) followed by Feast']
          : ['Full Raja-Bhoga Feast Prasadam'],
        description: rule.description,
        sunriseLocal,
        masa,
        paksha: sunriseTithi.paksha,
        source: 'gaurabda-engine',
      });
    }
  } catch (err) {
    console.warn('[GaurabdaCalendarEngine] Calculation notice:', err);
  }

  return Array.from(occasionsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parses an iCalendar (.ics) file exported from GCAL or vaisnavacalendar.info
 * into structured VaishnavaOccasion records, filtering out Masik Shivaratri & non-ISKCON events.
 */
export function parseVaishnavaICS(icsContent: string): VaishnavaOccasion[] {
  const results: VaishnavaOccasion[] = [];
  const blocks = icsContent.split('BEGIN:VEVENT');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0] || '';
    const dtMatch = block.match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/);
    const summaryMatch = block.match(/SUMMARY[^:]*:(.*)/);
    const descMatch = block.match(/DESCRIPTION[^:]*:(.*)/);

    if (!dtMatch || !summaryMatch) continue;

    const dateStr = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
    const name = summaryMatch[1].replace(/\\,/g, ',').trim();
    const desc = descMatch ? descMatch[1].replace(/\\n/g, ' ').replace(/\\,/g, ',').trim() : '';
    const lower = `${name} ${desc}`.toLowerCase();

    // Explicitly exclude Masik Shivaratri / Pradosha / Sankashti
    if (lower.includes('masik shivaratri') || lower.includes('masa shivaratri') || lower.includes('pradosha') || lower.includes('sankashti')) {
      continue;
    }

    const isEkadashi = lower.includes('ekadasi') || lower.includes('ekadashi');
    const isFasting =
      !isEkadashi &&
      (lower.includes('fast') ||
        lower.includes('gaura purnima') ||
        lower.includes('janmashtami') ||
        lower.includes('radhastami') ||
        lower.includes('nrsimha') ||
        lower.includes('rama navami'));

    if (!isEkadashi && !isFasting && !lower.includes('appearance') && !lower.includes('disappearance') && !lower.includes('feast')) {
      continue;
    }

    const paranaMatch = desc.match(/break fast[^0-9]*(\d{1,2}:\d{2}\s*(?:AM|PM)?(?:\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?)/i);

    results.push({
      date: dateStr,
      name,
      type: isEkadashi ? 'Ekadashi' : isFasting ? 'Fasting' : 'Festival',
      fastingRule: isEkadashi
        ? 'Grain Fast (Ekadashi Prasadam)'
        : isFasting
        ? 'Full Fast until Noon'
        : 'Feast',
      prohibitedItems: isEkadashi
        ? ['Rice', 'Wheat', 'All Grains', 'Beans', 'Mustard Oil']
        : isFasting
        ? ['Grains during fasting hours']
        : [],
      allowedSubstitutes: isEkadashi
        ? ['Sama Rice', 'Sabudana', 'Potatoes', 'Fruits', 'Milk', 'Ghee', 'Paneer']
        : ['Prasadam as per temple schedule'],
      description: desc || `${name} synced from GCAL / iCal feed.`,
      paranaWindow: paranaMatch ? paranaMatch[1].trim() : undefined,
      source: 'ics-sync',
    });
  }

  return results;
}
