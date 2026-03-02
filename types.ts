
export enum RiskLevel {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  MONITOR = 'Monitor'
}

export interface RawMaterialMaster {
  material_id: string;
  material_name: string;
  category: string;
  unit: string;
  colour: string;
  opening_stock: number;
  min_stock: number;
  avg_daily_use: number;
  status: string;
  notes: string;
}

export interface StockEntry {
  entry_id: string;
  date: string;
  material_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  colour: string;
  reason: string;
  notes: string;
}

export interface MaterialStockDetail {
  id: string;
  name: string;
  category: string;
  unit: string;
  totalStock: number;
  daysLeft: number;
  minStock: number;
  avgDailyUse: number;
  risk: RiskLevel;
  variants: { colour: string; qty: number }[];
}

export interface GroupedInventory {
  product: string;
  size: string;
  totalStock: number;
  totalCanProduce: number;
  mainBottleneck: string;
  mainRisk: RiskLevel;
}

export interface LogEntry {
  id: string;
  type: 'INWARD' | 'PRODUCTION' | 'SYSTEM';
  message: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}
