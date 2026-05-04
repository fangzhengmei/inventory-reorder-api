import { InventoryService } from '../InventoryService';
import {
  AddSKURequest,
  UpdateInventoryRequest,
  UpdateReorderConfigRequest,
  UrgencyLevel,
  InventoryItem,
  ReorderSuggestion
} from '../../types';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService();
  });

  describe('addSKU', () => {
    it('should add a new SKU with correct inventory settings', () => {
      const request: AddSKURequest = {
        skuId: 'SKU001',
        name: 'Test Product',
        description: 'A test product',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 50
      };

      const result = service.addSKU(request);

      expect(result.skuId).toBe('SKU001');
      expect(result.skuName).toBe('Test Product');
      expect(result.quantity).toBe(100);
      expect(result.reorderThreshold).toBe(20);
      expect(result.reorderQuantity).toBe(50);
      expect(result.isBelowThreshold).toBe(false);
    });

    it('should mark isBelowThreshold as true when initial quantity is below threshold', () => {
      const request: AddSKURequest = {
        skuId: 'SKU002',
        name: 'Low Stock Product',
        initialQuantity: 15,
        reorderThreshold: 20,
        reorderQuantity: 50
      };

      const result = service.addSKU(request);

      expect(result.isBelowThreshold).toBe(true);
    });

    it('should throw error when SKU already exists', () => {
      const request: AddSKURequest = {
        skuId: 'SKU001',
        name: 'Test Product',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 50
      };

      service.addSKU(request);

      expect(() => service.addSKU(request)).toThrow('SKU with id SKU001 already exists');
    });

    it('should throw error for negative reorder threshold', () => {
      const request: AddSKURequest = {
        skuId: 'SKU003',
        name: 'Invalid Product',
        initialQuantity: 100,
        reorderThreshold: -1,
        reorderQuantity: 50
      };

      expect(() => service.addSKU(request)).toThrow('Reorder threshold cannot be negative');
    });

    it('should throw error for zero or negative reorder quantity', () => {
      const request1: AddSKURequest = {
        skuId: 'SKU004',
        name: 'Invalid Product',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 0
      };

      const request2: AddSKURequest = {
        skuId: 'SKU005',
        name: 'Invalid Product',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: -10
      };

      expect(() => service.addSKU(request1)).toThrow('Reorder quantity must be greater than zero');
      expect(() => service.addSKU(request2)).toThrow('Reorder quantity must be greater than zero');
    });
  });

  describe('updateInventory', () => {
    beforeEach(() => {
      service.addSKU({
        skuId: 'SKU001',
        name: 'Test Product',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 50
      });
    });

    it('should add quantity to inventory', () => {
      const request: UpdateInventoryRequest = {
        skuId: 'SKU001',
        quantity: 50,
        operation: 'add'
      };

      const result = service.updateInventory(request);

      expect(result.quantity).toBe(150);
      expect(result.isBelowThreshold).toBe(false);
    });

    it('should subtract quantity from inventory', () => {
      const request: UpdateInventoryRequest = {
        skuId: 'SKU001',
        quantity: 30,
        operation: 'subtract'
      };

      const result = service.updateInventory(request);

      expect(result.quantity).toBe(70);
      expect(result.isBelowThreshold).toBe(false);
    });

    it('should set inventory to specific quantity', () => {
      const request: UpdateInventoryRequest = {
        skuId: 'SKU001',
        quantity: 10,
        operation: 'set'
      };

      const result = service.updateInventory(request);

      expect(result.quantity).toBe(10);
      expect(result.isBelowThreshold).toBe(true);
    });

    it('should mark isBelowThreshold as true when quantity falls below threshold', () => {
      const request: UpdateInventoryRequest = {
        skuId: 'SKU001',
        quantity: 90,
        operation: 'subtract'
      };

      const result = service.updateInventory(request);

      expect(result.quantity).toBe(10);
      expect(result.isBelowThreshold).toBe(true);
    });

    it('should throw error when SKU not found', () => {
      const request: UpdateInventoryRequest = {
        skuId: 'NONEXISTENT',
        quantity: 10,
        operation: 'add'
      };

      expect(() => service.updateInventory(request)).toThrow('SKU with id NONEXISTENT not found');
    });

    it('should throw error when subtracting more than available', () => {
      const request: UpdateInventoryRequest = {
        skuId: 'SKU001',
        quantity: 150,
        operation: 'subtract'
      };

      expect(() => service.updateInventory(request)).toThrow('Insufficient inventory');
    });
  });

  describe('updateReorderConfig', () => {
    beforeEach(() => {
      service.addSKU({
        skuId: 'SKU001',
        name: 'Test Product',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 50
      });
    });

    it('should update reorder threshold', () => {
      const request: UpdateReorderConfigRequest = {
        skuId: 'SKU001',
        reorderThreshold: 50
      };

      const result = service.updateReorderConfig(request);

      expect(result.reorderThreshold).toBe(50);
      expect(result.reorderQuantity).toBe(50);
    });

    it('should update reorder quantity', () => {
      const request: UpdateReorderConfigRequest = {
        skuId: 'SKU001',
        reorderQuantity: 100
      };

      const result = service.updateReorderConfig(request);

      expect(result.reorderThreshold).toBe(20);
      expect(result.reorderQuantity).toBe(100);
    });

    it('should update both threshold and quantity', () => {
      service.updateInventory({
        skuId: 'SKU001',
        quantity: 50,
        operation: 'set'
      });

      const request: UpdateReorderConfigRequest = {
        skuId: 'SKU001',
        reorderThreshold: 60,
        reorderQuantity: 80
      };

      const result = service.updateReorderConfig(request);

      expect(result.reorderThreshold).toBe(60);
      expect(result.reorderQuantity).toBe(80);
      expect(result.isBelowThreshold).toBe(true);
    });

    it('should recalculate isBelowThreshold when threshold changes', () => {
      service.updateInventory({
        skuId: 'SKU001',
        quantity: 30,
        operation: 'set'
      });

      let item = service.getInventoryItem('SKU001')!;
      expect(item.isBelowThreshold).toBe(false);

      service.updateReorderConfig({
        skuId: 'SKU001',
        reorderThreshold: 40
      });

      item = service.getInventoryItem('SKU001')!;
      expect(item.isBelowThreshold).toBe(true);
    });
  });

  describe('queryInventory', () => {
    beforeEach(() => {
      service.addSKU({
        skuId: 'SKU001',
        name: 'Normal Stock',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 50
      });

      service.addSKU({
        skuId: 'SKU002',
        name: 'Low Stock',
        initialQuantity: 10,
        reorderThreshold: 20,
        reorderQuantity: 50
      });

      service.addSKU({
        skuId: 'SKU003',
        name: 'Medium Stock',
        initialQuantity: 50,
        reorderThreshold: 30,
        reorderQuantity: 100
      });
    });

    it('should return all inventory items with correct counts', () => {
      const result = service.queryInventory(false);

      expect(result.totalItems).toBe(3);
      expect(result.belowThresholdCount).toBe(1);
      expect(result.items.length).toBe(3);
    });

    it('should return only below threshold items when flag is true', () => {
      const result = service.queryInventory(true);

      expect(result.totalItems).toBe(1);
      expect(result.items.length).toBe(1);
      expect(result.items[0].skuId).toBe('SKU002');
      expect(result.items[0].isBelowThreshold).toBe(true);
    });

    it('should correctly mark items below threshold', () => {
      const result = service.queryInventory(false);

      const sku001 = result.items.find((i: InventoryItem) => i.skuId === 'SKU001')!;
      const sku002 = result.items.find((i: InventoryItem) => i.skuId === 'SKU002')!;

      expect(sku001.isBelowThreshold).toBe(false);
      expect(sku002.isBelowThreshold).toBe(true);
    });
  });

  describe('generateReorderSuggestions', () => {
    beforeEach(() => {
      service.addSKU({
        skuId: 'SKU001',
        name: 'Out of Stock',
        initialQuantity: 0,
        reorderThreshold: 20,
        reorderQuantity: 50
      });

      service.addSKU({
        skuId: 'SKU002',
        name: 'Very Low Stock',
        initialQuantity: 3,
        reorderThreshold: 20,
        reorderQuantity: 50
      });

      service.addSKU({
        skuId: 'SKU003',
        name: 'Low Stock',
        initialQuantity: 10,
        reorderThreshold: 20,
        reorderQuantity: 50
      });

      service.addSKU({
        skuId: 'SKU004',
        name: 'Medium Stock',
        initialQuantity: 18,
        reorderThreshold: 20,
        reorderQuantity: 50
      });

      service.addSKU({
        skuId: 'SKU005',
        name: 'Normal Stock',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 50
      });
    });

    it('should only include items below threshold', () => {
      const result = service.generateReorderSuggestions();

      expect(result.totalSuggestions).toBe(4);
      expect(result.suggestions.every((s: ReorderSuggestion) => s.currentQuantity < s.reorderThreshold)).toBe(true);
    });

    it('should calculate correct deficit', () => {
      const result = service.generateReorderSuggestions();

      const sku002 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU002')!;
      const sku003 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU003')!;

      expect(sku002.deficit).toBe(17);
      expect(sku003.deficit).toBe(10);
    });

    it('should sort suggestions by urgency score descending', () => {
      const result = service.generateReorderSuggestions();

      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i - 1].urgencyScore).toBeGreaterThanOrEqual(
          result.suggestions[i].urgencyScore
        );
      }
    });

    it('should mark out of stock items as CRITICAL urgency', () => {
      const result = service.generateReorderSuggestions();

      const sku001 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU001')!;

      expect(sku001.urgencyLevel).toBe(UrgencyLevel.CRITICAL);
      expect(sku001.urgencyScore).toBe(100);
    });

    it('should mark very low stock (25% of threshold) as CRITICAL', () => {
      const result = service.generateReorderSuggestions();

      const sku002 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU002')!;

      expect(sku002.urgencyLevel).toBe(UrgencyLevel.CRITICAL);
    });

    it('should mark low stock (50% of threshold) as HIGH', () => {
      const result = service.generateReorderSuggestions();

      const sku003 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU003')!;

      expect(sku003.urgencyLevel).toBe(UrgencyLevel.HIGH);
    });

    it('should mark near threshold (75%+) as MEDIUM or LOW', () => {
      const result = service.generateReorderSuggestions();

      const sku004 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU004')!;

      expect([UrgencyLevel.MEDIUM, UrgencyLevel.LOW]).toContain(sku004.urgencyLevel);
    });

    it('should calculate total reorder quantity', () => {
      const result = service.generateReorderSuggestions();

      expect(result.totalReorderQuantity).toBe(200);
    });

    it('should return empty result when no items below threshold', () => {
      const emptyService = new InventoryService();
      emptyService.addSKU({
        skuId: 'SKU001',
        name: 'Normal Stock',
        initialQuantity: 100,
        reorderThreshold: 20,
        reorderQuantity: 50
      });

      const result = emptyService.generateReorderSuggestions();

      expect(result.totalSuggestions).toBe(0);
      expect(result.suggestions.length).toBe(0);
      expect(result.totalReorderQuantity).toBe(0);
    });
  });

  describe('Urgency Score Calculation', () => {
    it('should return 100 for out of stock items', () => {
      service.addSKU({
        skuId: 'SKU001',
        name: 'Out of Stock',
        initialQuantity: 0,
        reorderThreshold: 100,
        reorderQuantity: 50
      });

      const result = service.generateReorderSuggestions();

      expect(result.suggestions[0].urgencyScore).toBe(100);
      expect(result.suggestions[0].urgencyLevel).toBe(UrgencyLevel.CRITICAL);
    });

    it('should have higher score for items closer to zero', () => {
      service.addSKU({
        skuId: 'SKU001',
        name: 'Almost Out',
        initialQuantity: 1,
        reorderThreshold: 100,
        reorderQuantity: 50
      });

      service.addSKU({
        skuId: 'SKU002',
        name: 'Some Stock',
        initialQuantity: 50,
        reorderThreshold: 100,
        reorderQuantity: 50
      });

      const result = service.generateReorderSuggestions();

      const sku001 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU001')!;
      const sku002 = result.suggestions.find((s: ReorderSuggestion) => s.skuId === 'SKU002')!;

      expect(sku001.urgencyScore).toBeGreaterThan(sku002.urgencyScore);
    });
  });
});