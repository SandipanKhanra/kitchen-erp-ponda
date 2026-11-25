export interface VaishnavaOccasion {
  date: string;              // YYYY-MM-DD
  name: string;              // e.g. "Utpanna Ekadashi", "Gaura Purnima"
  type: 'Ekadashi' | 'Fasting' | 'Festival';
  fastingRule: 'Grain Fast (Ekadashi Prasadam)' | 'Full Fast until Sunset' | 'Full Fast until Noon' | 'Full Fast until Moonrise' | 'Feast';
  prohibitedItems: string[]; // ["Rice", "Wheat", "Dal", "Beans", "Mustard Oil", "Corn"]
  allowedSubstitutes: string[]; // ["Sama Rice", "Sabudana", "Potatoes", "Buckwheat (Kuttu)", "Fruits", "Milk", "Ghee", "Paneer"]
  description: string;
  sunriseLocal?: string;     // e.g. "06:38 AM"
  paranaWindow?: string;     // e.g. "06:39 AM – 09:42 AM (Next Day)"
  masa?: string;             // e.g. "Kartika" (Damodara)
  paksha?: string;           // e.g. "Shukla" | "Krishna"
  source?: 'gaurabda-engine' | 'ics-sync' | 'firestore';
}

export interface CenterLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  label?: string;
}
