// C:\Project\ecommerce\ecommerce-web\backend\src\database\seeds\country-city-states.ts (Fixed)

import { City, Country, State } from 'country-state-city';
import { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { db } from '..';
import {
	currencies,
	masterGeoCities,
	masterGeoCountries,
	masterGeoStates,
} from '../schema';

// Define the required types for clarity
type NewCurrency = InferInsertModel<typeof currencies>;

async function insertCurrencyIfNotExists(currencyData: NewCurrency) {
	// Check if the currency code already exists in the database
	const existingCurrency = await db
		.select({ code: currencies.code })
		.from(currencies)
		.where(eq(currencies.code, currencyData.code))
		.limit(1);

	// 💡 CORRECT LOGIC: If it DOES NOT exist, then insert it.
	if (existingCurrency.length === 0) {
		// Use onConflictDoNothing to handle race conditions or future runs gracefully
		await db.insert(currencies).values(currencyData).onConflictDoNothing();
	}
}

export async function seedGeoData() {
	const allCountries = Country.getAllCountries();

	for (const countryData of allCountries) {
		// 1. Ensure Currency is seeded first (REQUIRED for FK)
		// We do this inside the loop to ensure every country's currency is covered
		const currencyToInsert: NewCurrency = {
			code: countryData.currency,
			name: countryData.currency, // Use proper name if available, otherwise code
			symbol: countryData.currency, // Use proper symbol if available, otherwise code
			// Add other mandatory fields like decimals, rate_to_base if needed
		};
		await insertCurrencyIfNotExists(currencyToInsert);

		// 2. Insert Country (Checking mapping)
		const newCountry = {
			isoCode2: countryData.isoCode, // AF
			isoCode3: countryData.isoCode, // 💡 CORRECTED: Use .isoCode3 (e.g., AFG)
			name: countryData.name,
			currencyCode: countryData.currency, // AFN
			phoneCode: countryData.phonecode,
			region: 'UNKNOWN',
		};

		// Drizzle insertion:
		const insertedCountry = await db
			.insert(masterGeoCountries)
			.values(newCountry)
			.returning();

		const countryId = insertedCountry[0].id;

		// 3. Seed States and Cities (The rest of your logic is structurally sound)
		const states = State.getStatesOfCountry(countryData.isoCode);

		for (const stateData of states) {
			const insertedState = await db
				.insert(masterGeoStates)
				.values({
					countryId: countryId,
					name: stateData.name,
					code: stateData.isoCode,
					type: null,
				})
				.returning();

			const stateId = insertedState[0].id;

			const cities = City.getCitiesOfState(
				countryData.isoCode,
				stateData.isoCode,
			);

			for (const cityData of cities) {
				await db.insert(masterGeoCities).values({
					stateId: stateId,
					name: cityData.name,
					postalCodePattern: null,
				});
			}
		}
	}
}
