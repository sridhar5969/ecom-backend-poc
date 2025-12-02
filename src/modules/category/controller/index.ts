import { Router } from 'express';
import { CategoryController } from './controller';

const categoryRouter = Router();

categoryRouter.get('/', CategoryController.getAllCategoriesController);

categoryRouter.get('/:slug', CategoryController.getCategoryBySlug);

export default categoryRouter;
