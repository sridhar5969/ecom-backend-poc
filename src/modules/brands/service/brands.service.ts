import { sql, eq } from 'drizzle-orm';
import { BrandsListQueryParams } from '../controller/validator';
import { db } from '@/database';
import { brands } from '@/database/schema';

export class BrandsService {
	public async getAllBrands(queryParams: BrandsListQueryParams) {
		const data = await db
			.select({
				id: brands.id,
				name: brands.name,
				slug: brands.slug,
				description: brands.description,
				// logo_url: brands.logo_url,
			})
			.from(brands)
			.limit(queryParams.limit)
			.offset((queryParams.page - 1) * queryParams.limit);
		const total = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(brands)
			.then((res) => Number(res[0]['count']) as number);
		return {
			items: data,
			meta: {
				total: total,
				page: queryParams.page,
				limit: queryParams.limit,
				last_page: Math.ceil(total / queryParams.limit),
			},
		};
	}

	public async findBrandsBySlug(slug: string) {
		const [brand] = await db
			.select({
				id: brands.id,
				name: brands.name,
				slug: brands.slug,
				description: brands.description,
				logo: brands.logoUrl,
				attributes: brands.attributes,
			})
			.from(brands)
			.where(eq(brands.slug, slug));
		const data = {
			id: brand.id,
			name: brand.name,
			slug: brand.slug,
			description: brand.description,
			logo: brand.logo,
			theme_color: brand.attributes?.theme_color || null,
			banner_image: brand.attributes?.banner_image || null,
		};
		return data;
	}
}
