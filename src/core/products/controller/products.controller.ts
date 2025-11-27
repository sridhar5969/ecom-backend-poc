import { Request, Response } from 'express';
import { ProductsService } from '../services/products.service';
import { successResponse } from '@/utils/responseFormatter';

export class ProductsController {
	private static productsService: ProductsService;
	constructor() {}

	public static async getProductsByCategory(req: Request, res: Response) {
		const task = 'GET_PRODUCTS_BY_CATEGORY';
		try {
			const { categoryId } = req.params;
			const data =
				this.productsService.findProductsByCategory(categoryId);
			const result = successResponse(data);
			return res.json(result);
		} catch (error) {
			console.error(`ERROR_${task}:`, error);
			throw error;
		}
	}
}
