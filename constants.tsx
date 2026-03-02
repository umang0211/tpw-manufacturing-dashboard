
import { GroupedInventory, RawMaterialMaster } from './types';

export const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  gray: '#64748b',
};

// Removed all MOCK data to ensure 100% data integrity from the sheet source.
export const MOCK_INVENTORY: GroupedInventory[] = [];
// Fix: Changed RawMaterial to RawMaterialMaster as RawMaterial does not exist in types.ts
export const MOCK_RAW_MATERIALS: RawMaterialMaster[] = [];

// Base chart structure (initially empty or static labels)
export const CONSUMPTION_DATA = [
  { day: 'Mon', usage: 0 },
  { day: 'Tue', usage: 0 },
  { day: 'Wed', usage: 0 },
  { day: 'Thu', usage: 0 },
  { day: 'Fri', usage: 0 },
  { day: 'Sat', usage: 0 },
  { day: 'Sun', usage: 0 },
];

export const PRODUCTION_DATA = [
  { day: 'Mon', prod: 0, dispatch: 0 },
  { day: 'Tue', prod: 0, dispatch: 0 },
  { day: 'Wed', prod: 0, dispatch: 0 },
  { day: 'Thu', prod: 0, dispatch: 0 },
  { day: 'Fri', prod: 0, dispatch: 0 },
  { day: 'Sat', prod: 0, dispatch: 0 },
  { day: 'Sun', prod: 0, dispatch: 0 },
];
