import { eq } from 'drizzle-orm';
import {
	productCategories,
	products,
} from './../../../database/schema/products';
import { db } from '@/database';
export class ProductsService {
	constructor() {}
	async findProductsByCategory(categoryId: string) {
		// Implementation to find products by category
		return db
			.select({
				id: products.id,
				name: products.title,
			})
			.from(products)
			.innerJoin(
				productCategories,
				eq(productCategories.productId, products.id),
			)
			.where(eq(productCategories.categoryId, categoryId));
	}
}
