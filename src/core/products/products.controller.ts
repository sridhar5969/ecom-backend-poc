import { Request, Response } from 'express';
import { ProductsService } from './services/products.service';

export class ProductsController {
	private static productsService: ProductsService;
	constructor() {}

	public static async getProductsByCategory(req: Request, res: Response) {
		const task = 'GET_PRODUCTS_BY_CATEGORY';
		try {
			const { categoryId } = req.params;
			const data =
				this.productsService.findProductsByCategory(categoryId);
			res.status(200).json({ success: true, data });
		} catch (error) {
			console.error(`Error in ${task}:`, error);
			throw error;
		}
	}
}
