import { Router } from 'express';
import { memoryUploadMiddleware } from '@/middleware/fileUpload';
import { ProductsController } from './products.controller';

const productsRouter = Router();

productsRouter.get(
	'/category/:categoryId',
	ProductsController.getProductsByCategory,
);

productsRouter.post(
	'/import-materials',
	memoryUploadMiddleware,
	ProductsController.importMaterials,
);
export default productsRouter;
