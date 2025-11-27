import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import router from './router';
import env from '@/env';
// import { initLogWatcher } from '@/lib/watcher';
import addErrorHandler from '@/middleware/error-handler';
import requestLogger from '@/middleware/requestLogger';
import { RoleBaseAccess } from '@/middleware/roleBasesAccess';
import { errorResponse } from '@/utils/responseFormatter';
export default class App {
	public express: express.Application;

	public httpServer: http.Server;

	public connection: void;

	public async init(): Promise<void> {
		this.express = express();
		this.httpServer = http.createServer(this.express);

		// add all global middleware like cors
		this.middleware();

		this.express.use('/api', router);

		RoleBaseAccess.init();

		this.unhandlerRoute();

		// add the middleware to handle error, make sure to add if after registering routes method
		this.express.use(addErrorHandler);

		// Blob Logger Initiate
		// this.loggerWatcher();
	}

	private middleware(): void {
		// Security headers
		this.express.use(helmet({ contentSecurityPolicy: false }));

		this.express.use(cookieParser());

		// Body parsing
		this.express.use(express.json({ limit: '10000mb' }));
		this.express.use(
			express.urlencoded({ limit: '10000mb', extended: true }),
		);
		// add multiple cors options as per your use
		const corsOptions = {
			origin: [env.APP_URI],
			credentials: true,
		};
		this.express.use(cors(corsOptions));

		this.express.use((req, res, next) => {
			res.set('Cross-Origin-Resource-Policy', 'cross-origin');
			next();
		});

		// Request/Response logging middleware (after body parsing to access req.body)
		this.express.use(requestLogger);
	}

	private unhandlerRoute(): void {
		this.express.use((req, res) => {
			const errorResp = errorResponse(
				`Can't find ${req.originalUrl} on this server!!!`,
				undefined,
				404,
			);
			res.status(404).json(errorResp);
		});
	}

	private async loggerWatcher() {
		// temporarily disable log watcher
		// initLogWatcher();
	}
}
