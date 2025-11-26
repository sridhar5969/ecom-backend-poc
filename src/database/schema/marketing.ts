import { relations } from 'drizzle-orm';
import {
    pgTable,
    varchar,
    uuid,
    text,
    timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { orders } from './orders';

export const marketingAttributions = pgTable('marketing_attributions', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').unique().references(() => orders.id),
    userId: uuid('user_id').references(() => users.id),
    utmSource: varchar('utm_source'),
    utmMedium: varchar('utm_medium'),
    utmCampaign: varchar('utm_campaign'),
    utmTerm: varchar('utm_term'),
    utmContent: varchar('utm_content'),
    referrerUrl: text('referrer_url'),
    landingPageUrl: text('landing_page_url'),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address'),
    deviceType: varchar('device_type'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const marketingAttributionsRelations = relations(marketingAttributions, ({ one }) => ({
    order: one(orders, {
        fields: [marketingAttributions.orderId],
        references: [orders.id],
    }),
    user: one(users, {
        fields: [marketingAttributions.userId],
        references: [users.id],
    }),
}));
