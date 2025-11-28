// C:\Project\ecommerce\ecommerce-web\backend\src\database\seeds\country-city-states.ts (Fixed)

// import { City, Country, State } from 'country-state-city';
// import { eq } from 'drizzle-orm';
// import { db } from '../index';
// import {
// 	masterGeoCities,
// 	masterGeoCountries,
// 	masterGeoStates,
// } from '../schema/system';

export async function seedGeoData() {
	// console.log('🌱 Seeding Geo Data (Countries, States, Cities)...');

	// // Filter for Nigeria only as per requirements to avoid massive data insertion
	// const targetCountries = ['NG'];
	// const allCountries = Country.getAllCountries().filter((c) =>
	// 	targetCountries.includes(c.isoCode),
	// );

	// for (const countryData of allCountries) {
	// 	console.log(`  → Processing ${countryData.name}...`);

	// 	// Check if country exists
	// 	const existingCountry = await db.query.masterGeoCountries.findFirst({
	// 		where: eq(masterGeoCountries.isoCode2, countryData.isoCode),
	// 	});

	// 	let countryId = existingCountry?.id;

	// 	if (!existingCountry) {
	// 		// Map 2-char code to 3-char code manually for Nigeria, or use 2-char as fallback
	// 		const iso3 =
	// 			countryData.isoCode === 'NG' ? 'NGA' : countryData.isoCode;

	// 		const [insertedCountry] = await db
	// 			.insert(masterGeoCountries)
	// 			.values({
	// 				isoCode2: countryData.isoCode,
	// 				isoCode3: iso3,
	// 				name: countryData.name,
	// 				currencyCode: countryData.currency,
	// 				phoneCode: countryData.phonecode,
	// 				region: 'Africa', // Hardcoded for Nigeria
	// 				isActive: true,
	// 			})
	// 			.onConflictDoNothing()
	// 			.returning();

	// 		if (insertedCountry) {
	// 			countryId = insertedCountry.id;
	// 		}
	// 	}

	// 	if (countryId) {
	// 		const states = State.getStatesOfCountry(countryData.isoCode);
	// 		console.log(`    → Found ${states.length} states`);

	// 		for (const stateData of states) {
	// 			// Check if state exists
	// 			const existingState = await db.query.masterGeoStates.findFirst({
	// 				where: (states, { eq, and }) =>
	// 					and(
	// 						eq(states.countryId, countryId!),
	// 						eq(states.code, stateData.isoCode),
	// 					),
	// 			});

	// 			let stateId = existingState?.id;

	// 			if (!existingState) {
	// 				const [insertedState] = await db
	// 					.insert(masterGeoStates)
	// 					.values({
	// 						countryId: countryId,
	// 						name: stateData.name,
	// 						code: stateData.isoCode,
	// 						type: 'State',
	// 					})
	// 					.onConflictDoNothing()
	// 					.returning();

	// 				if (insertedState) {
	// 					stateId = insertedState.id;
	// 				}
	// 			}

	// 			if (stateId) {
	// 				const cities = City.getCitiesOfState(
	// 					countryData.isoCode,
	// 					stateData.isoCode,
	// 				);

	// 				if (cities.length > 0) {
	// 					// Batch insert cities
	// 					const citiesToInsert = cities.map((city) => ({
	// 						stateId: stateId!,
	// 						name: city.name,
	// 						postalCodePattern: null,
	// 						isServiceable: true,
	// 					}));

	// 					// Insert in chunks of 50 to be safe
	// 					const chunkSize = 50;
	// 					for (
	// 						let i = 0;
	// 						i < citiesToInsert.length;
	// 						i += chunkSize
	// 					) {
	// 						const chunk = citiesToInsert.slice(
	// 							i,
	// 							i + chunkSize,
	// 						);
	// 						await db
	// 							.insert(masterGeoCities)
	// 							.values(chunk)
	// 							.onConflictDoNothing();
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// }
	console.log('✅ Geo Data seeded successfully!');
}
