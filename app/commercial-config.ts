export type ServiceCategory = "Transport" | "Dining" | "Experiences" | "Wellness" | "Celebrations" | "Family" | "Convenience" | "Events";

export type ResortService = {
  id: string;
  category: ServiceCategory;
  name: string;
  unit: string;
  price: number;
  defaultEnabled: boolean;
};

export const serviceCategories: ServiceCategory[] = ["Transport", "Dining", "Experiences", "Wellness", "Celebrations", "Family", "Convenience", "Events"];

export const serviceCatalogue: ResortService[] = [
  { id: "airport-pickup", category: "Transport", name: "Airport pickup", unit: "per trip", price: 3200, defaultEnabled: true },
  { id: "airport-drop", category: "Transport", name: "Airport drop", unit: "per trip", price: 3200, defaultEnabled: false },
  { id: "railway-transfer", category: "Transport", name: "Railway station transfer", unit: "per trip", price: 1800, defaultEnabled: false },
  { id: "local-cab", category: "Transport", name: "Local sightseeing cab", unit: "per day", price: 4500, defaultEnabled: true },
  { id: "chauffeur", category: "Transport", name: "Chauffeur service", unit: "per day", price: 3800, defaultEnabled: false },
  { id: "bike-rental", category: "Transport", name: "Bike / scooter rental", unit: "per day", price: 900, defaultEnabled: false },

  { id: "breakfast", category: "Dining", name: "Breakfast", unit: "per adult", price: 450, defaultEnabled: true },
  { id: "kids-breakfast", category: "Dining", name: "Kids breakfast", unit: "per child", price: 250, defaultEnabled: true },
  { id: "lunch", category: "Dining", name: "Lunch", unit: "per person", price: 650, defaultEnabled: false },
  { id: "dinner", category: "Dining", name: "Dinner", unit: "per person", price: 800, defaultEnabled: true },
  { id: "barbecue", category: "Dining", name: "Private barbecue", unit: "per group", price: 3500, defaultEnabled: false },
  { id: "candle-dinner", category: "Dining", name: "Candlelight dinner", unit: "per couple", price: 4200, defaultEnabled: false },
  { id: "high-tea", category: "Dining", name: "High tea", unit: "per person", price: 350, defaultEnabled: false },
  { id: "packed-meal", category: "Dining", name: "Packed meal / picnic basket", unit: "per person", price: 600, defaultEnabled: false },

  { id: "jeep-safari", category: "Experiences", name: "Jeep safari", unit: "per trip", price: 4500, defaultEnabled: true },
  { id: "campfire", category: "Experiences", name: "Private campfire", unit: "per evening", price: 1800, defaultEnabled: true },
  { id: "plantation-walk", category: "Experiences", name: "Guided plantation walk", unit: "per group", price: 1200, defaultEnabled: true },
  { id: "trekking", category: "Experiences", name: "Guided trekking", unit: "per person", price: 1500, defaultEnabled: false },
  { id: "bird-watching", category: "Experiences", name: "Bird-watching trail", unit: "per group", price: 1600, defaultEnabled: false },
  { id: "boating", category: "Experiences", name: "Boating / kayaking", unit: "per person", price: 1100, defaultEnabled: false },
  { id: "fishing", category: "Experiences", name: "Fishing experience", unit: "per person", price: 900, defaultEnabled: false },
  { id: "cycling", category: "Experiences", name: "Guided cycling tour", unit: "per person", price: 1200, defaultEnabled: false },
  { id: "cultural-show", category: "Experiences", name: "Local cultural performance", unit: "per group", price: 6500, defaultEnabled: false },
  { id: "cooking-class", category: "Experiences", name: "Local cooking class", unit: "per person", price: 1800, defaultEnabled: false },
  { id: "stargazing", category: "Experiences", name: "Stargazing session", unit: "per group", price: 1400, defaultEnabled: false },

  { id: "spa", category: "Wellness", name: "Ayurvedic spa", unit: "per person", price: 2800, defaultEnabled: true },
  { id: "massage", category: "Wellness", name: "Full-body massage", unit: "per person", price: 2400, defaultEnabled: false },
  { id: "yoga", category: "Wellness", name: "Private yoga session", unit: "per session", price: 1600, defaultEnabled: false },
  { id: "meditation", category: "Wellness", name: "Guided meditation", unit: "per session", price: 1200, defaultEnabled: false },

  { id: "honeymoon", category: "Celebrations", name: "Honeymoon room setup", unit: "per stay", price: 3800, defaultEnabled: false },
  { id: "birthday", category: "Celebrations", name: "Birthday decoration", unit: "per event", price: 2800, defaultEnabled: false },
  { id: "anniversary", category: "Celebrations", name: "Anniversary decoration", unit: "per event", price: 3200, defaultEnabled: false },
  { id: "cake", category: "Celebrations", name: "Celebration cake", unit: "per cake", price: 1200, defaultEnabled: false },
  { id: "photography", category: "Celebrations", name: "Resort photography session", unit: "per session", price: 5000, defaultEnabled: false },

  { id: "extra-bed", category: "Family", name: "Extra bed", unit: "per night", price: 1500, defaultEnabled: true },
  { id: "baby-crib", category: "Family", name: "Baby crib", unit: "per stay", price: 500, defaultEnabled: false },
  { id: "babysitting", category: "Family", name: "Babysitting", unit: "per hour", price: 600, defaultEnabled: false },
  { id: "kids-activity", category: "Family", name: "Kids activity pack", unit: "per child", price: 750, defaultEnabled: false },

  { id: "early-checkin", category: "Convenience", name: "Early check-in", unit: "per room", price: 1500, defaultEnabled: false },
  { id: "late-checkout", category: "Convenience", name: "Late check-out", unit: "per room", price: 1800, defaultEnabled: false },
  { id: "day-use", category: "Convenience", name: "Day-use extension", unit: "per room", price: 3200, defaultEnabled: false },
  { id: "laundry", category: "Convenience", name: "Laundry service", unit: "per item", price: 180, defaultEnabled: false },
  { id: "pet-stay", category: "Convenience", name: "Pet stay fee", unit: "per night", price: 1000, defaultEnabled: false },

  { id: "conference-hall", category: "Events", name: "Conference hall", unit: "per day", price: 18000, defaultEnabled: false },
  { id: "meeting-package", category: "Events", name: "Meeting package", unit: "per person", price: 1200, defaultEnabled: false },
  { id: "projector-pa", category: "Events", name: "Projector & PA system", unit: "per day", price: 4500, defaultEnabled: false },
  { id: "banquet", category: "Events", name: "Banquet package", unit: "per person", price: 1800, defaultEnabled: false },
  { id: "team-building", category: "Events", name: "Team-building activities", unit: "per person", price: 1400, defaultEnabled: false },
];

export const cardOffers = [
  { id: "none", name: "No card offer", rate: 0, cap: 0, minimum: 0 },
  { id: "hdfc", name: "HDFC Bank · 10% instant discount", rate: 0.1, cap: 2000, minimum: 15000 },
  { id: "icici", name: "ICICI Bank · 12% instant discount", rate: 0.12, cap: 2500, minimum: 20000 },
  { id: "upi", name: "UPI welcome offer · 5% cashback", rate: 0.05, cap: 750, minimum: 5000 },
];

export const loyaltyRewards = [
  { id: "none", name: "Do not redeem points", points: 0, value: 0 },
  { id: "stay-credit", name: "₹500 next-stay credit", points: 2500, value: 500 },
  { id: "breakfast-reward", name: "Breakfast reward", points: 1800, value: 900 },
  { id: "airport-reward", name: "Airport pickup reward", points: 8500, value: 3200 },
  { id: "spa-reward", name: "Ayurvedic spa reward", points: 6000, value: 2800 },
  { id: "safari-reward", name: "Jeep safari reward", points: 9000, value: 4500 },
];
