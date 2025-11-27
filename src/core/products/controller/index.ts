import { Router } from 'express';
import { ProductsController } from './products.controller';
import { memoryUploadMiddleware } from '@/middleware/fileUpload';

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
