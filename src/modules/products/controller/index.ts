import { Router } from 'express';
import { ProductsController } from './products.controller';
import { memoryUploadMiddleware } from '@/middleware/fileUpload';

const productsRouter = Router();

productsRouter.get('/', ProductsController.getAllProductsController);
productsRouter.get('/:slug', ProductsController.getProductBySlugController);

productsRouter.post(
	'/import-materials',
	memoryUploadMiddleware,
	ProductsController.importMaterials,
);

export default productsRouter;
