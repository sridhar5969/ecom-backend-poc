import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '@/database';
import { heroSlides, featuredProducts, banner } from '@/database/schema';

const router = Router();

router.get('/hero-slides', async (req, res) => {
	try {
		const now = new Date();

		const slides = await db
			.select()
			.from(heroSlides)
			.where(
				and(
					eq(heroSlides.isActive, true),
					or(
						isNull(heroSlides.startAt),
						lte(heroSlides.startAt, now),
					),
					or(isNull(heroSlides.endAt), gte(heroSlides.endAt, now)),
				),
			)
			.orderBy(heroSlides.displayOrder);

		res.json({ data: slides });
	} catch (error) {
		console.error('Error fetching hero slides:', error);
		res.status(500).json({ error: 'Failed to fetch hero slides' });
	}
});

router.get('/featured-products', async (req, res) => {
	try {
		const { section = 'trending' } = req.query;
		const now = new Date();

		const featured = await db
			.select()
			.from(featuredProducts)
			.where(
				and(
					eq(featuredProducts.isActive, true),
					eq(featuredProducts.section, section as string),
					or(
						isNull(featuredProducts.startAt),
						lte(featuredProducts.startAt, now),
					),
					or(
						isNull(featuredProducts.endAt),
						gte(featuredProducts.endAt, now),
					),
				),
			)
			.orderBy(featuredProducts.displayOrder)
			.limit(12);

		res.json({ data: featured });
	} catch (error) {
		console.error('Error fetching featured products:', error);
		res.status(500).json({ error: 'Failed to fetch featured products' });
	}
});

router.get('/banners', async (req, res) => {
	try {
		const now = new Date();

		const banners = await db
			.select()
			.from(banner)
			.where(
				and(
					or(isNull(banner.startAt), lte(banner.startAt, now)),
					or(isNull(banner.endAt), gte(banner.endAt, now)),
				),
			)
			.orderBy(banner.order);

		res.json({ data: banners });
	} catch (error) {
		console.error('Error fetching banners:', error);
		res.status(500).json({ error: 'Failed to fetch banners' });
	}
});

export default router;
