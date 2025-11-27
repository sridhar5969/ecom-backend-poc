import { Router } from 'express';
import { ProductsController } from './products.controller';
import { memoryUploadMiddleware } from '@/middleware/fileUpload';

const productsRouter = Router();

productsRouter.get('/', ProductsController.getAllProductsController);

productsRouter.post(
	'/import-materials',
	memoryUploadMiddleware,
	ProductsController.importMaterials,
);

export default productsRouter;
