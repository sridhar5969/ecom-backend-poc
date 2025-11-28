import * as express from 'express';
import { z, ZodError } from 'zod/v4';

import { AppGlobalError } from '@/abstractions/formatError';
import { BadRequestResponse } from '@/utils/apiResponse';
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
	const clientMessage = err.message;
	// statusCode >= 500 ? 'Something went wrong' : err.message;

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
	if (err instanceof ZodError)
		return new BadRequestResponse(res, z.prettifyError(err)).send();

	const success = statusCode >= 200 && statusCode < 300;
	const payload: Record<string, unknown> = {
		success,
		timestamp: new Date().toISOString(),
		message: clientMessage,
	};

	if (parsedStackError?.fieldErrors) {
		payload.errors = parsedStackError.fieldErrors;
	}

	res.status(statusCode).json(payload);
};

export default addErrorHandler;
