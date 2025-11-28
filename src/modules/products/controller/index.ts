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

productsRouter.get(
	'/bundles/available-variants',
	ProductsController.getAvailableVariantsController,
);

productsRouter.post('/bundles', ProductsController.createBundleController);

productsRouter.put(
	'/bundles/:variantId',
	ProductsController.updateBundleController,
);

productsRouter.delete(
	'/bundles/:variantId',
	ProductsController.deleteBundleController,
);

productsRouter.get(
	'/:slug/bundles',
	ProductsController.getBundleDetailsController,
);

productsRouter.get('/:slug', ProductsController.getProductBySlugController);

export default productsRouter;
