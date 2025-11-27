import { eq, and, desc } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '@/database';
import {
	products,
	productVariants,
	productImages,
	categories,
	brands,
	productReviews,
	relatedProducts,
} from '@/database/schema';

const router = Router();

router.get('/products', async (req, res) => {
	try {
		const { _category, _brand, _search, page = 1, limit = 20 } = req.query;

		const query = db
			.select()
			.from(products)
			.leftJoin(brands, eq(products.brandId, brands.id))
			.leftJoin(
				categories,
				eq(products.canonicalCategoryId, categories.id),
			)
			.where(eq(products.status, 'active'))
			.limit(Number(limit))
			.offset((Number(page) - 1) * Number(limit));

		const result = await query;

		res.json({
			data: result,
			pagination: {
				page: Number(page),
				limit: Number(limit),
			},
		});
	} catch (error) {
		console.error('Error fetching products:', error);
		res.status(500).json({ error: 'Failed to fetch products' });
	}
});

router.get('/products/:slug', async (req, res) => {
	try {
		const { slug } = req.params;

		const [product] = await db
			.select()
			.from(products)
			.where(eq(products.slug, slug))
			.limit(1);

		if (!product) {
			return res.status(404).json({ error: 'Product not found' });
		}

		const variants = await db
			.select()
			.from(productVariants)
			.where(eq(productVariants.productId, product.id));

		const images = await db
			.select()
			.from(productImages)
			.where(eq(productImages.productId, product.id))
			.orderBy(productImages.displayOrder);

		const reviews = await db
			.select()
			.from(productReviews)
			.where(
				and(
					eq(productReviews.productId, product.id),
					eq(productReviews.status, 'approved'),
				),
			)
			.orderBy(desc(productReviews.createdAt))
			.limit(10);

		const related = await db
			.select()
			.from(relatedProducts)
			.leftJoin(
				products,
				eq(relatedProducts.relatedProductId, products.id),
			)
			.where(eq(relatedProducts.productId, product.id))
			.limit(6);

		res.json({
			product,
			variants,
			images,
			reviews,
			relatedProducts: related,
		});
	} catch (error) {
		console.error('Error fetching product:', error);
		res.status(500).json({ error: 'Failed to fetch product' });
	}
});

router.get('/categories', async (req, res) => {
	try {
		const result = await db.select().from(categories);
		res.json({ data: result });
	} catch (error) {
		console.error('Error fetching categories:', error);
		res.status(500).json({ error: 'Failed to fetch categories' });
	}
});

router.get('/brands', async (req, res) => {
	try {
		const result = await db
			.select()
			.from(brands)
			.where(eq(brands.isActive, true));
		res.json({ data: result });
	} catch (error) {
		console.error('Error fetching brands:', error);
		res.status(500).json({ error: 'Failed to fetch brands' });
	}
});

export default router;
