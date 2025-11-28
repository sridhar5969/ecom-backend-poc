import * as express from 'express';
import { z, ZodError } from 'zod/v4';

import AppError, { PayloadValidatorError } from '@/abstractions/AppError';
import { AppGlobalError } from '@/abstractions/formatError';

import {
	BadRequestResponse,
	UnauthorizedResponse,
	ForbiddenResponse,
	NotFoundResponse,
	ConflictResponse,
	InternalErrorResponse,
} from '@/utils/apiResponse';

import logger from '@/utils/logger/logger';

function tryParseJson(str: string) {
	try {
		return JSON.parse(str);
	} catch {
		return null;
	}
}

const addErrorHandler = (
	err: AppGlobalError | Error,
	req: express.Request,
	res: express.Response,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	next: express.NextFunction,
) => {
	const parsedStackError = tryParseJson((err as any).stackErr);
	const statusCode = (err as any).statusCode ?? 500;
	const message = err.message ?? 'Internal Server Error';

	logger.error('API error', {
		message,
		statusCode,
		request: {
			method: req.method,
			url: req.url,
			headers: req.headers,
		},
		userDetails: req?.user_details,
		parsedStackError,
		stack: err.stack,
		actualStack: (err as any).stackErr,
	});

	// -------------------------------------------------------
	// Zod Validation Errors
	// -------------------------------------------------------
	if (err instanceof ZodError) {
		return new BadRequestResponse(res, z.prettifyError(err)).send();
	}

	// -------------------------------------------------------
	// PayloadValidatorError (400)
	// -------------------------------------------------------
	if (err instanceof PayloadValidatorError) {
		return new BadRequestResponse(res, err.message).send();
	}

	// -------------------------------------------------------
	// AppError-based responses mapped to your ApiResponse classes
	// -------------------------------------------------------
	if (err instanceof AppError) {
		switch (err.statusCode) {
			case 400:
				return new BadRequestResponse(res, err.message).send();
			case 401:
				return new UnauthorizedResponse(res, err.message).send();
			case 403:
				return new ForbiddenResponse(res, err.message).send();
			case 404:
				return new NotFoundResponse(res, err.message).send();
			case 409:
				return new ConflictResponse(res, err.message).send();
			default:
				return new InternalErrorResponse(res, err.message).send();
		}
	}

	// -------------------------------------------------------
	// Unknown Error → Always 500
	// -------------------------------------------------------
	return new InternalErrorResponse(res, 'Internal Server Error').send();
};

export default addErrorHandler;
