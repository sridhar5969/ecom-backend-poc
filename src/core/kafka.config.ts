import { z } from 'zod';
import env from '../env';

const kafkaConfigSchema = z.object({
	KAFKA_BROKERS: z.string().default('localhost:9092'),
	KAFKA_CLIENT_ID: z.string().default('ecommerce-backend'),
	KAFKA_GROUP_ID: z.string().default('ecommerce-group'),
	KAFKA_ENABLED: z.string().default('false'),
});

export const kafkaConfig = kafkaConfigSchema.parse({
	KAFKA_BROKERS: env.KAFKA_BROKERS,
	KAFKA_CLIENT_ID: env.KAFKA_CLIENT_ID,
	KAFKA_GROUP_ID: env.KAFKA_GROUP_ID,
	KAFKA_ENABLED: env.KAFKA_ENABLED,
});

export const KAFKA_TOPICS = {
	ORDER_CREATED: 'order.created',
	ORDER_UPDATED: 'order.updated',
	ORDER_CANCELLED: 'order.cancelled',
	PAYMENT_PROCESSED: 'payment.processed',
	PAYMENT_FAILED: 'payment.failed',
	INVENTORY_UPDATED: 'inventory.updated',
	INVENTORY_LOW_STOCK: 'inventory.low-stock',
	USER_REGISTERED: 'user.registered',
	USER_UPDATED: 'user.updated',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
