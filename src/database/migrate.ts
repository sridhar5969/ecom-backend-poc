import path from 'path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closeConnection } from './index';
import logger from '@/utils/logger/logger';

async function main() {
	logger.info('Running migrations...');

	try {
		await migrate(db, {
			migrationsFolder: path.join(__dirname, 'migrations'),
		});
		logger.info('Migrations completed successfully.');
	} catch (error) {
		logger.error('Error running migrations:', error);
		process.exit(1);
	} finally {
		await closeConnection();
	}
}

main();
