import {
	seedMasterData,
	seedProducts,
	seedUsers,
	seedRolePermissions,
} from './seeds';

(async () => {
	try {
		console.log('🚀 Starting database seeding...\n');

		await seedMasterData();
		await seedUsers();
		await seedRolePermissions();
		await seedProducts();

		console.log('\n✅ Database seeding completed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('❌ Error seeding database:', error);
		process.exit(1);
	}
})();
