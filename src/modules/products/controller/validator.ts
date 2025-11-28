import { z, infer as zodInfer } from 'zod/v4';

const validateGetProductsByCategory = z.object({
	categoryId: z.string().min(1),
});

const BundleComponentSchema = z.object({
	variantId: z.string().uuid('Invalid variant ID format'),
	quantity: z.number().int().positive('Quantity must be a positive integer'),
});

const CreateBundleSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	slug: z.string().min(1, 'Slug is required'),
	flags: z
		.object({
			isFeatured: z.boolean().optional(),
			isOnSale: z.boolean().optional(),
		})
		.optional(),
	brandId: z.string().uuid('Invalid brand ID').optional(),
	canonicalCategoryId: z.string().uuid('Invalid category ID').optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	variant: z.object({
		sku: z.string().min(1, 'SKU is required'),
		name: z.string().min(1, 'Variant name is required'),
		priceAmount: z.number().positive('Price must be positive'),
		priceCurrency: z.string().default('NGN'),
		compareAtAmount: z.number().positive().optional(),
		costPriceAmount: z.number().positive().optional(),
		weightKg: z.number().positive().optional(),
		attributes: z.record(z.string(), z.any()).optional(),
	}),
	components: z
		.array(BundleComponentSchema)
		.min(1, 'At least one component is required'),
});

const UpdateBundleSchema = z.object({
	components: z
		.array(BundleComponentSchema)
		.min(1, 'At least one component is required'),
});
export type CreateBundlePayloadType = zodInfer<typeof CreateBundleSchema>;

export default {
	validateGetProductsByCategory,
	CreateBundleSchema,
	UpdateBundleSchema,
	BundleComponentSchema,
};
