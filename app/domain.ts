export type ViewKey = "overview" | "reservations" | "frontdesk" | "housekeeping" | "payments" | "maintenance" | "reports";

export type Reservation = {
  id: string; guest: string; phone: string; unit: string; checkIn: string; checkOut: string;
  source: "Direct" | "Booking.com" | "MakeMyTrip" | "Walk-in";
  amount: number; paid: number; status: "Confirmed" | "Checked in" | "Pending";
};

export type Unit = {
  id: string; name: string; type: "Cottage" | "Room"; parent?: string;
  status: "Available" | "Occupied" | "Dirty" | "Blocked"; rate: number;
};

export const seedReservations: Reservation[] = [
  { id: "STX-1042", guest: "Anjali Menon", phone: "+91 98470 22118", unit: "Pepper Cottage", checkIn: "17 Sep", checkOut: "19 Sep", source: "Direct", amount: 18400, paid: 9200, status: "Confirmed" },
  { id: "STX-1041", guest: "Rahul Nair", phone: "+91 99615 44082", unit: "Cardamom Suite", checkIn: "17 Sep", checkOut: "18 Sep", source: "Booking.com", amount: 8200, paid: 8200, status: "Checked in" },
  { id: "STX-1040", guest: "Meera Thomas", phone: "+91 94471 36220", unit: "Cedar Room A", checkIn: "18 Sep", checkOut: "20 Sep", source: "MakeMyTrip", amount: 12600, paid: 3000, status: "Confirmed" },
  { id: "STX-1039", guest: "Vishnu Pillai", phone: "+91 97452 11806", unit: "Cedar Room B", checkIn: "19 Sep", checkOut: "21 Sep", source: "Direct", amount: 12000, paid: 0, status: "Pending" },
];

export const seedUnits: Unit[] = [
  { id: "pepper", name: "Pepper Cottage", type: "Cottage", status: "Available", rate: 9200 },
  { id: "cedar", name: "Cedar 2-BHK", type: "Cottage", status: "Occupied", rate: 12400 },
  { id: "cedar-a", name: "Cedar Room A", type: "Room", parent: "cedar", status: "Occupied", rate: 6300 },
  { id: "cedar-b", name: "Cedar Room B", type: "Room", parent: "cedar", status: "Blocked", rate: 6100 },
  { id: "cardamom", name: "Cardamom Suite", type: "Room", status: "Occupied", rate: 8200 },
  { id: "mist", name: "Mist Valley Room", type: "Room", status: "Dirty", rate: 6800 },
];

export const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
