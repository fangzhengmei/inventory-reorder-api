import {
  SKU,
  InventoryItem,
  ReorderSuggestion,
  UrgencyLevel,
  AddSKURequest,
  UpdateInventoryRequest,
  UpdateReorderConfigRequest,
  InventoryQueryResult,
  ReorderSuggestionResult
} from '../types';

export class InventoryService {
  private skus: Map<string, SKU> = new Map();
  private inventory: Map<string, InventoryItem> = new Map();

  addSKU(request: AddSKURequest): InventoryItem {
    if (!request.skuId || request.skuId.trim() === '') {
      throw new Error('SKU ID cannot be empty or whitespace');
    }

    if (!request.name || request.name.trim() === '') {
      throw new Error('SKU name cannot be empty or whitespace');
    }

    const trimmedSkuId = request.skuId.trim();

    if (this.skus.has(trimmedSkuId)) {
      throw new Error(`SKU with id ${trimmedSkuId} already exists`);
    }

    if (request.reorderThreshold < 0) {
      throw new Error('Reorder threshold cannot be negative');
    }

    if (request.reorderQuantity <= 0) {
      throw new Error('Reorder quantity must be greater than zero');
    }

    if (request.initialQuantity < 0) {
      throw new Error('Initial quantity cannot be negative');
    }

    const trimmedName = request.name.trim();
    const now = new Date();
    const sku: SKU = {
      id: trimmedSkuId,
      name: trimmedName,
      description: request.description,
      createdAt: now,
      updatedAt: now
    };

    const inventoryItem: InventoryItem = {
      skuId: trimmedSkuId,
      skuName: trimmedName,
      quantity: request.initialQuantity,
      reorderThreshold: request.reorderThreshold,
      reorderQuantity: request.reorderQuantity,
      isBelowThreshold: request.initialQuantity < request.reorderThreshold,
      lastUpdated: now
    };

    this.skus.set(trimmedSkuId, sku);
    this.inventory.set(trimmedSkuId, inventoryItem);

    return inventoryItem;
  }

  getSKU(skuId: string): SKU | undefined {
    return this.skus.get(skuId);
  }

  getAllSKUs(): SKU[] {
    return Array.from(this.skus.values());
  }

  updateInventory(request: UpdateInventoryRequest): InventoryItem {
    const item = this.inventory.get(request.skuId);
    if (!item) {
      throw new Error(`SKU with id ${request.skuId} not found`);
    }

    let newQuantity: number;
    switch (request.operation) {
      case 'add':
        if (request.quantity < 0) {
          throw new Error('Quantity to add must be non-negative');
        }
        newQuantity = item.quantity + request.quantity;
        break;
      case 'subtract':
        if (request.quantity < 0) {
          throw new Error('Quantity to subtract must be non-negative');
        }
        newQuantity = item.quantity - request.quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient inventory');
        }
        break;
      case 'set':
        if (request.quantity < 0) {
          throw new Error('Quantity cannot be negative');
        }
        newQuantity = request.quantity;
        break;
      default:
        throw new Error(`Invalid operation: ${request.operation}`);
    }

    const updatedItem: InventoryItem = {
      ...item,
      quantity: newQuantity,
      isBelowThreshold: newQuantity < item.reorderThreshold,
      lastUpdated: new Date()
    };

    this.inventory.set(request.skuId, updatedItem);

    const sku = this.skus.get(request.skuId);
    if (sku) {
      sku.updatedAt = new Date();
    }

    return updatedItem;
  }

  updateReorderConfig(request: UpdateReorderConfigRequest): InventoryItem {
    const item = this.inventory.get(request.skuId);
    if (!item) {
      throw new Error(`SKU with id ${request.skuId} not found`);
    }

    const updatedThreshold = request.reorderThreshold !== undefined ? request.reorderThreshold : item.reorderThreshold;
    const updatedQuantity = request.reorderQuantity !== undefined ? request.reorderQuantity : item.reorderQuantity;

    if (updatedThreshold < 0) {
      throw new Error('Reorder threshold cannot be negative');
    }

    if (updatedQuantity <= 0) {
      throw new Error('Reorder quantity must be greater than zero');
    }

    const updatedItem: InventoryItem = {
      ...item,
      reorderThreshold: updatedThreshold,
      reorderQuantity: updatedQuantity,
      isBelowThreshold: item.quantity < updatedThreshold,
      lastUpdated: new Date()
    };

    this.inventory.set(request.skuId, updatedItem);
    return updatedItem;
  }

  getInventoryItem(skuId: string): InventoryItem | undefined {
    return this.inventory.get(skuId);
  }

  queryInventory(includeOnlyBelowThreshold: boolean = false): InventoryQueryResult {
    let items = Array.from(this.inventory.values());

    if (includeOnlyBelowThreshold) {
      items = items.filter(item => item.isBelowThreshold);
    }

    const belowThresholdCount = Array.from(this.inventory.values()).filter(
      item => item.isBelowThreshold
    ).length;

    return {
      items,
      totalItems: items.length,
      belowThresholdCount
    };
  }

  generateReorderSuggestions(): ReorderSuggestionResult {
    const suggestions: ReorderSuggestion[] = [];

    for (const item of this.inventory.values()) {
      if (item.isBelowThreshold) {
        const deficit = item.reorderThreshold - item.quantity;
        const { urgencyLevel, urgencyScore } = this.calculateUrgency(item, deficit);

        suggestions.push({
          skuId: item.skuId,
          skuName: item.skuName,
          currentQuantity: item.quantity,
          reorderThreshold: item.reorderThreshold,
          reorderQuantity: item.reorderQuantity,
          deficit,
          urgencyLevel,
          urgencyScore
        });
      }
    }

    suggestions.sort((a, b) => b.urgencyScore - a.urgencyScore);

    const totalReorderQuantity = suggestions.reduce(
      (sum, suggestion) => sum + suggestion.reorderQuantity,
      0
    );

    return {
      suggestions,
      totalSuggestions: suggestions.length,
      totalReorderQuantity
    };
  }

  private calculateUrgency(
    item: InventoryItem,
    deficit: number
  ): { urgencyLevel: UrgencyLevel; urgencyScore: number } {
    if (item.quantity === 0 && deficit > 0) {
      return { urgencyLevel: UrgencyLevel.CRITICAL, urgencyScore: 100 };
    }

    const thresholdRatio = item.quantity / item.reorderThreshold;

    if (thresholdRatio <= 0.25) {
      return { urgencyLevel: UrgencyLevel.CRITICAL, urgencyScore: 75 + (1 - thresholdRatio) * 25 };
    } else if (thresholdRatio <= 0.5) {
      return { urgencyLevel: UrgencyLevel.HIGH, urgencyScore: 50 + (1 - thresholdRatio) * 25 };
    } else if (thresholdRatio <= 0.75) {
      return { urgencyLevel: UrgencyLevel.MEDIUM, urgencyScore: 25 + (1 - thresholdRatio) * 25 };
    } else {
      return { urgencyLevel: UrgencyLevel.LOW, urgencyScore: (1 - thresholdRatio) * 25 };
    }
  }

  clearAll(): void {
    this.skus.clear();
    this.inventory.clear();
  }
}