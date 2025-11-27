import chokidar, { FSWatcher } from 'chokidar';
import { fileLoggerBlob } from '@/utils/fileLoggerBlob';
import logger from '@/utils/logger';

export function initLogWatcher(): FSWatcher {
	const logDir = './logs';

	const watcher = chokidar.watch(`${logDir}/*.log`, {
		persistent: true,
		ignoreInitial: true,
		usePolling: true,
		interval: 10000,
		awaitWriteFinish: {
			stabilityThreshold: 5000,
			pollInterval: 500,
		},
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	watcher.on('add', async (filePath) => {
		logger.debug('ADD | FILE STARTED UPLOADING | WATCHER');
		await fileLoggerBlob.uploadFile();
		logger.debug('ADD | FILE STARTED DONE | WATCHER');
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	watcher.on('change', async (filePath) => {
		logger.debug('CHANGE | FILE STARTED UPLOADING | WATCHER');
		await fileLoggerBlob.uploadFile();
		logger.debug('CHANGE | FILE STARTED DONE | WATCHER');
	});

	watcher.on('error', (error) => {
		logger.error('Chokidar watcher error:', error);
	});

	watcher.on('ready', async () => {
		logger.info('READY | WATCHER');
	});

	return watcher;
}
