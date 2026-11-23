export interface VaishnavaOccasion {
  date: string;              // YYYY-MM-DD
  name: string;              // e.g. "Utpanna Ekadashi", "Gaura Purnima"
  type: 'Ekadashi' | 'Fasting' | 'Festival';
  fastingRule: 'Grain Fast (Ekadashi Prasadam)' | 'Full Fast until Sunset' | 'Full Fast until Noon' | 'Feast';
  prohibitedItems: string[]; // ["Rice", "Wheat", "Dal", "Beans", "Mustard Oil", "Corn"]
  allowedSubstitutes: string[]; // ["Sama Rice", "Sabudana", "Potatoes", "Buckwheat (Kuttu)", "Fruits", "Milk", "Ghee", "Paneer"]
  description: string;
}
