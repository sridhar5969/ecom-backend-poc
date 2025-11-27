import { Router } from 'express';
import { ProductsController } from './products.controller';

const productsRouter = Router();

productsRouter.get(
	'/category/:categoryId',
	ProductsController.getProductsByCategory,
);
export default productsRouter;
