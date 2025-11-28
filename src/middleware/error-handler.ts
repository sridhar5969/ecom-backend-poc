import * as express from 'express';
import { AppGlobalError } from '@/abstractions/formatError';
import logger from '@/utils/logger/logger';

function tryParseJson(str: string) {
	try {
		return JSON.parse(str);
	} catch {
		return null;
	}
}

const addErrorHandler = (
	err: AppGlobalError,
	req: express.Request,
	res: express.Response,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	next: express.NextFunction,
) => {
	const parsedStackError = tryParseJson(err.stackErr); // For Zod errors

	const statusCode = err.statusCode || 500;
	const clientMessage =
		statusCode >= 500 ? 'Something went wrong' : err.message;

	logger.error('API error', {
		message: err.message || 'Internal Server Error',
		statusCode,
		request: {
			method: req.method,
			url: req.url,
			headers: req.headers,
			// body: req.body,
		},
		userDetails: req?.user_details,
		parsedStackError,
		stack: err.stack,
		actualStack: err.stackErr,
	});

	res.status(statusCode).json({
		message: clientMessage,
		...(parsedStackError && { errors: parsedStackError.fieldErrors }),
	});
};

export default addErrorHandler;
