import { relations } from 'drizzle-orm';
import {
    pgTable,
    varchar,
    uuid,
    boolean,
    text,
    timestamp,
    integer,
    numeric,
    serial,
} from 'drizzle-orm/pg-core';

export const currencies = pgTable('currencies', {
    code: varchar('code').primaryKey(),
    symbol: varchar('symbol'),
    name: varchar('name'),
    decimals: integer('decimals').default(2),
    rateToBase: numeric('rate_to_base', { precision: 18, scale: 8 }),
    updatedAt: timestamp('updated_at'),
});

export const taxRules = pgTable('tax_rules', {
    id: uuid('id').defaultRandom().primaryKey(),
    countryCode: varchar('country_code'),
    stateCode: varchar('state_code'),
    name: varchar('name'),
    rate: numeric('rate', { precision: 6, scale: 4 }),
    priority: integer('priority').default(10),
    startAt: timestamp('start_at'),
    endAt: timestamp('end_at'),
});

export const permissions = pgTable('permissions', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name').unique(),
    description: text('description'),
});

export const masterGeoCountries = pgTable('master_geo_countries', {
    id: serial('id').primaryKey(),
    isoCode2: varchar('iso_code_2', { length: 2 }).unique(),
    isoCode3: varchar('iso_code_3', { length: 3 }).unique(),
    name: varchar('name'),
    currencyCode: varchar('currency_code').references(() => currencies.code),
    phoneCode: varchar('phone_code'),
    region: varchar('region'),
    isActive: boolean('is_active').default(true),
});

export const masterGeoStates = pgTable('master_geo_states', {
    id: serial('id').primaryKey(),
    countryId: integer('country_id').references(() => masterGeoCountries.id),
    name: varchar('name'),
    code: varchar('code'),
    type: varchar('type'),
});

export const masterGeoCities = pgTable('master_geo_cities', {
    id: uuid('id').defaultRandom().primaryKey(),
    stateId: integer('state_id').references(() => masterGeoStates.id),
    name: varchar('name'),
    postalCodePattern: varchar('postal_code_pattern'),
    isServiceable: boolean('is_serviceable').default(true),
});

export const masterReturnReasons = pgTable('master_return_reasons', {
    id: serial('id').primaryKey(),
    code: varchar('code').unique(),
    label: varchar('label'),
    requiresPhoto: boolean('requires_photo').default(false),
    isActive: boolean('is_active').default(true),
});

export const masterHelpArticles = pgTable('master_help_articles', {
    id: uuid('id').defaultRandom().primaryKey(),
    category: varchar('category'),
    question: text('question'),
    answer: text('answer'), // html type in sql, text here
    displayOrder: integer('display_order'),
    isPublished: boolean('is_published').default(true),
});

export const masterSystemSettings = pgTable('master_system_settings', {
    key: varchar('key').primaryKey(),
    value: text('value'),
    type: varchar('type').default('string'),
    description: text('description'),
    isPublic: boolean('is_public').default(false),
});

// Relations
export const masterGeoCountriesRelations = relations(masterGeoCountries, ({ one, many }) => ({
    currency: one(currencies, {
        fields: [masterGeoCountries.currencyCode],
        references: [currencies.code],
    }),
    states: many(masterGeoStates),
}));

export const masterGeoStatesRelations = relations(masterGeoStates, ({ one, many }) => ({
    country: one(masterGeoCountries, {
        fields: [masterGeoStates.countryId],
        references: [masterGeoCountries.id],
    }),
    cities: many(masterGeoCities),
}));

export const masterGeoCitiesRelations = relations(masterGeoCities, ({ one }) => ({
    state: one(masterGeoStates, {
        fields: [masterGeoCities.stateId],
        references: [masterGeoStates.id],
    }),
}));
