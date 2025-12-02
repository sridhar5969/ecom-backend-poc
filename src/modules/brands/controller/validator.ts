import { z } from 'zod/v4';

const BrandsListQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(10),
	search: z.string().trim().optional(),
});

export type BrandsListQueryParams = z.infer<typeof BrandsListQuerySchema>;
export default {
	BrandsListQuerySchema,
};
