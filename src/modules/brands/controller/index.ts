import { Router } from 'express';
import { BrandsController } from './controller';

const brandsRouter = Router();

brandsRouter.get('/', BrandsController.getAllBrandsController);
brandsRouter.get('/:slug', BrandsController.getBrandBySlugController);

export default brandsRouter;
