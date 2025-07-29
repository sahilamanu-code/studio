export interface Collection {
  id: string;
  cleanerName: string;
  site: string;
  date: string; // ISO string
  amount: number;
  notes?: string;
}

export interface Deposit {
  id: string;
  cleanerName: string; 
  site: string;
  date: string; // ISO string
  cashAmount: number;
  cardAmount: number;
  totalAmount: number;
  depositSlip?: string; // data URI for the image
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
