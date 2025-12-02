import { sql, eq } from 'drizzle-orm';

import { CategoryListQueryParams } from '../controller/validator';
import { db } from '@/database';
import { categories } from '@/database/schema';

export class CategoryListService {
	public async getAllCategories(queryParams: CategoryListQueryParams) {
		const data = await db
			.select({
				id: categories.id,
				name: categories.name,
				slug: categories.slug,
			})
			.from(categories)
			.limit(queryParams.limit)
			.offset((queryParams.page - 1) * queryParams.limit);
		const total = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(categories)
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

	public async findCategoryBySlug(slug: string) {
		const category = await db
			.select()
			.from(categories)
			.where(eq(categories.slug, slug))
			.limit(1)
			.then((res) => res[0] || null);
		return category;
	}
}
