// schemas/checkout.schema.ts
import { z } from 'zod';

export const addressSchema = z.object({
	fullName: z.string(),
	line1: z.string(),
	line2: z.string().optional(),
	city: z.string(),
	state: z.string(),
	postalCode: z.string(),
	country: z.string(),
	phone: z.string(),
});

export const checkoutSchema = z.object({
	shippingAddress: addressSchema,
	billingAddress: addressSchema.optional(),
	useShippingAsBilling: z.boolean().default(true),

	paymentMethod: z.enum(['cod', 'online']), // COD or online payment

	// For online payment
	paymentProvider: z.string().optional(), // fallback to env.PAYMENT_PROVIDER
});
export type CheckoutPayloadType = z.infer<typeof checkoutSchema>;

export default {
	checkoutSchema,
};
