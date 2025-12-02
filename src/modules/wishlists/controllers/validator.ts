import { z } from 'zod/v4';

export const createWishListSchema = z.object({
	name: z.string(),
	isPublic: z.boolean(),
});

export type CreateWishListPayload = z.infer<typeof createWishListSchema>;
