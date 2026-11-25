import {
  computeEkadashiDatesForYear,
  computeFestivalsForYear,
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

/**
 * Formats an ISO-like local timestamp string (e.g. "2026-11-20T06:38:22.946+05:30")
 * into clean 12-hour time ("06:38 AM").
 */
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

const VAISHNAVA_FESTIVAL_KEYWORDS = [
  'janmashtami',
  'gaura',
  'radhashtami',
  'rama navami',
  'narasimha',
  'nrsimha',
  'balarama',
  'govardhana',
  'vasanta panchami',
  'shivaratri',
  'ratha yatra',
  'akhanda',
  'varaha',
  'vamana',
];

/**
 * Computes all Ekadashi & major Vaishnava Fasting/Festival dates for a full year
 * using exact astronomical sunrise, sunset, tithi, and Parana windows for the Center's location.
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
      // Sample around 06:00 local-ish UTC to inspect daily panchang for this civil date
      const noonSample = new Date(`${dateStr}T06:00:00Z`);
      const daily = getDailyPanchang(noonSample, geo, opts);

      const sunriseLocal = formatLocalTime(daily?.sun?.riseLocal);
      const chandramasa = daily?.calendar?.chandramasa?.purnimantaName || daily?.calendar?.chandramasa?.name || '';
      const activeTithi =
        daily?.angas?.tithis?.find((t: any) => t.number === 11) ||
        daily?.angas?.tithis?.find((t: any) => t.isActiveAtSunrise) ||
        daily?.angas?.tithis?.[0];
      const paksha = activeTithi?.paksha || '';

      // Determine Ekadashi name from festival list or Masa+Paksha lookup
      const festEkadashi = daily?.festivals?.find(
        (f: any) => f.key === 'ekadashi' || f.key === 'smarta_ekadashi'
      );
      const lookupName = EKADASHI_BY_MASA_PAKSHA[`${chandramasa}_${paksha}`];
      const ekadashiName =
        (festEkadashi?.description && festEkadashi.description.includes('Ekadashi')
          ? festEkadashi.description
          : lookupName) || `${paksha} Ekadashi (${chandramasa})`;

      // Calculate Parana (break-fast) window on Dvadashi (next day)
      const nextDay = new Date(noonSample.getTime() + 24 * 60 * 60 * 1000);
      const nextDaily = getDailyPanchang(nextDay, geo, opts);
      const nextSunriseLocal = nextDaily?.sun?.riseLocal;
      const dvadashiTithi = nextDaily?.angas?.tithis?.find((t: any) => t.number === 12);

      let paranaWindow = '';
      if (nextSunriseLocal) {
        const startStr = formatLocalTime(nextSunriseLocal);
        const dayDurationMins = nextDaily?.sun?.dayDurationMinutes || 720;
        const maxParanaMins = Math.round(dayDurationMins / 3); // 1/3rd of daylight
        let endStr = addMinutesToLocalTime(nextSunriseLocal, maxParanaMins);

        // If Dvadashi ends earlier than 1/3rd daylight, Parana ends at Dvadashi end
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

    // 2. Compute major Vaishnava festivals for the year
    const festivals = computeFestivalsForYear(year, geo, opts);
    for (const item of festivals) {
      const fName = item.festival?.name || '';
      const fLower = fName.toLowerCase();
      const isVaishnava = VAISHNAVA_FESTIVAL_KEYWORDS.some((kw) => fLower.includes(kw));
      if (!isVaishnava) continue;

      const d = new Date(item.date);
      // Adjust to local civil date in target timezone using Intl
      const localDateStr = d.toLocaleDateString('en-CA', { timeZone: location.timezone });
      if (occasionsMap.has(localDateStr)) continue;

      const isFast =
        fLower.includes('janmashtami') ||
        fLower.includes('gaura') ||
        fLower.includes('narasimha') ||
        fLower.includes('nrsimha') ||
        fLower.includes('navami') ||
        fLower.includes('shivaratri') ||
        fLower.includes('radhashtami');

      occasionsMap.set(localDateStr, {
        date: localDateStr,
        name: fName,
        type: isFast ? 'Fasting' : 'Festival',
        fastingRule: fLower.includes('gaura')
          ? 'Full Fast until Moonrise'
          : fLower.includes('janmashtami')
          ? 'Full Fast until Midnight' as any
          : isFast
          ? 'Full Fast until Noon'
          : 'Feast',
        prohibitedItems: isFast ? ['Grains during fasting hours'] : [],
        allowedSubstitutes: isFast
          ? ['Anukalpa Prasadam (Fruits, Milk, Sabudana, Sama Rice) followed by Feast']
          : ['Full Raja-Bhoga Feast Prasadam'],
        description: item.festival?.description || `Vaishnava Festival (${fName}) for ${location.label || location.timezone}.`,
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
 * into structured VaishnavaOccasion records.
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

    const isEkadashi = lower.includes('ekadasi') || lower.includes('ekadashi');
    const isFasting =
      !isEkadashi &&
      (lower.includes('fast') ||
        lower.includes('gaura purnima') ||
        lower.includes('janmashtami') ||
        lower.includes('radhastami') ||
        lower.includes('nrsimha') ||
        lower.includes('rama navami'));

    // Only keep Ekadashi / Fasting / major Vaishnava festivals
    if (!isEkadashi && !isFasting && !lower.includes('appearance') && !lower.includes('feast')) {
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
