import { Request, Response } from 'express';

export enum ResponseStatus {
	SUCCESS = 200,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	INTERNAL_ERROR = 500,
	NO_CONTENT = 204,
	CONFLICT = 409,
	GONE = 410,
	METHOD_NOT_ALLOWED = 405,
	PRECONDITION_FAILED = 412,
}

abstract class ApiResponse {
	constructor(
		protected res: Response,
		protected statusCode: ResponseStatus,
		protected message?: string | Record<string, unknown>,
		protected data: unknown | null = null,
		protected request: Request | null = null,
	) {}

	public send(): void {
		const success = this.statusCode >= 200 && this.statusCode < 300;
		const payload: Record<string, unknown> = {
			success,
			data: this.data ?? null,
			timestamp: new Date().toISOString(),
		};
		if (this.message !== undefined) {
			payload.message = this.message;
		}
		this.res.status(this.statusCode).json(payload);
	}
}

export class NotFoundResponse extends ApiResponse {
	constructor(res: Response, message = 'Not Found') {
		super(res, ResponseStatus.NOT_FOUND, message);
	}
}

export class InternalErrorResponse extends ApiResponse {
	constructor(res: Response, message = 'Unknown error occurred') {
		super(res, ResponseStatus.INTERNAL_ERROR, message);
	}
}

export class BadRequestResponse extends ApiResponse {
	constructor(res: Response, message: string) {
		super(res, ResponseStatus.BAD_REQUEST, message);
	}
}

export class SuccessResponse extends ApiResponse {
	constructor(res: Response, message: string, data?: unknown);
	constructor(res: Response, data?: unknown);
	constructor(res: Response, arg2?: string | unknown, arg3?: unknown) {
		if (typeof arg2 === 'string') {
			super(res, ResponseStatus.SUCCESS, arg2, arg3);
			return;
		}
		super(res, ResponseStatus.SUCCESS, undefined, arg2);
	}
}

export class NoContentResponse extends ApiResponse {
	constructor(res: Response, message: string) {
		super(res, ResponseStatus.NO_CONTENT, message);
	}
}

export class UnauthorizedResponse extends ApiResponse {
	constructor(res: Response, message: string) {
		super(res, ResponseStatus.UNAUTHORIZED, message);
	}
}

export class ConflictResponse extends ApiResponse {
	constructor(res: Response, message: string) {
		super(res, ResponseStatus.CONFLICT, message);
	}
}
export class MethodNotAllowedResponse extends ApiResponse {
	constructor(res: Response, message: string = 'Method not allowed') {
		super(res, ResponseStatus.METHOD_NOT_ALLOWED, message);
	}
}

export class ForbiddenResponse extends ApiResponse {
	constructor(res: Response, message: string = 'Forbidden access') {
		// Logout User if user access any forbidden API (deactivate users token)
		super(res, ResponseStatus.FORBIDDEN, message);
	}
}
export class PreconditionFailedResponse extends ApiResponse {
	constructor(res: Response, message: string) {
		super(res, ResponseStatus.PRECONDITION_FAILED, message);
	}
}
export class ExpiredResponse extends ApiResponse {
	constructor(res: Response, message: string) {
		super(res, ResponseStatus.GONE, message);
	}
}
