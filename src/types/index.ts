export interface SKU {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  skuId: string;
  skuName: string;
  quantity: number;
  reorderThreshold: number;
  reorderQuantity: number;
  isBelowThreshold: boolean;
  lastUpdated: Date;
}

export interface ReorderSuggestion {
  skuId: string;
  skuName: string;
  currentQuantity: number;
  reorderThreshold: number;
  reorderQuantity: number;
  deficit: number;
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
}

export enum UrgencyLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface AddSKURequest {
  skuId: string;
  name: string;
  description?: string;
  initialQuantity: number;
  reorderThreshold: number;
  reorderQuantity: number;
}

export interface UpdateInventoryRequest {
  skuId: string;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
}

export interface UpdateReorderConfigRequest {
  skuId: string;
  reorderThreshold?: number;
  reorderQuantity?: number;
}

export interface InventoryQueryResult {
  items: InventoryItem[];
  totalItems: number;
  belowThresholdCount: number;
}

export interface ReorderSuggestionResult {
  suggestions: ReorderSuggestion[];
  totalSuggestions: number;
  totalReorderQuantity: number;
}