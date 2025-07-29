export interface Collection {
  id: string;
  cleanerName: string;
  site: string;
  date: string; // ISO string
  carPlate: string;
  amount: number;
  notes?: string;
}

export interface Deposit {
  id: string;
  cleanerName: string; 
  date: string; // ISO string
  amount: number;
  depositSlip?: string; // For MVP, we'll just store a note or filename.
}

export interface PendingItem {
  id: string;
  cleanerName: string;
  site: string;
  carPlate: string;
  amount: number;
  date: string; // Date of the pending list
}

export interface CleanerSummary {
  name: string;
  totalCollections: number;
  totalDeposits: number;
  cashInHand: number;
  lastCollectionDate: string | null;
  daysSinceLastCollection: number | null;
}
