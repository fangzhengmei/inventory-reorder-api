import express, { Application, Request, Response } from 'express';
import { router as inventoryRouter } from './routes/inventory';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Inventory Reorder API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      sku: {
        create: 'POST /api/sku',
        get: 'GET /api/sku/:skuId',
        list: 'GET /api/sku'
      },
      inventory: {
        update: 'PUT /api/inventory',
        get: 'GET /api/inventory/:skuId',
        list: 'GET /api/inventory'
      },
      reorder: {
        config: 'PUT /api/reorder-config',
        suggestions: 'GET /api/reorder-suggestions'
      }
    }
  });
});

app.use('/api', inventoryRouter);

app.listen(PORT, () => {
  console.log(`Inventory Reorder API is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}`);
});

export default app;