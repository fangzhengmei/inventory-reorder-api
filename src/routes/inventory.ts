import { Router, Request, Response } from 'express';
import { InventoryService } from '../services/InventoryService';
import {
  AddSKURequest,
  UpdateInventoryRequest,
  UpdateReorderConfigRequest
} from '../types';

const router = Router();
const inventoryService = new InventoryService();

router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.post('/sku', (req: Request, res: Response) => {
  try {
    const request: AddSKURequest = req.body;
    const result = inventoryService.addSKU(request);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/sku/:skuId', (req: Request, res: Response) => {
  const sku = inventoryService.getSKU(req.params.skuId);
  if (sku) {
    res.status(200).json(sku);
  } else {
    res.status(404).json({ error: 'SKU not found' });
  }
});

router.get('/sku', (req: Request, res: Response) => {
  const skus = inventoryService.getAllSKUs();
  res.status(200).json(skus);
});

router.put('/inventory', (req: Request, res: Response) => {
  try {
    const request: UpdateInventoryRequest = req.body;
    const result = inventoryService.updateInventory(request);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/inventory/:skuId', (req: Request, res: Response) => {
  const item = inventoryService.getInventoryItem(req.params.skuId);
  if (item) {
    res.status(200).json(item);
  } else {
    res.status(404).json({ error: 'Inventory item not found' });
  }
});

router.get('/inventory', (req: Request, res: Response) => {
  const includeOnlyBelowThreshold = req.query.belowThreshold === 'true';
  const result = inventoryService.queryInventory(includeOnlyBelowThreshold);
  res.status(200).json(result);
});

router.put('/reorder-config', (req: Request, res: Response) => {
  try {
    const request: UpdateReorderConfigRequest = req.body;
    const result = inventoryService.updateReorderConfig(request);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/reorder-suggestions', (req: Request, res: Response) => {
  const result = inventoryService.generateReorderSuggestions();
  res.status(200).json(result);
});

export { router, inventoryService };