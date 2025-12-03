class AppError extends Error {
	public statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.message = message;
		this.statusCode = statusCode;
	}
}

export default AppError;

// validator error
export class PayloadValidatorError extends AppError {
	constructor(message: string) {
		super(message, 400);
	}
}

// New readable error classes:
export class NotFoundError extends AppError {
	constructor(message = 'Resource not found') {
		super(message, 404);
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Forbidden') {
		super(message, 403);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized') {
		super(message, 401);
	}
}

export class ConflictError extends AppError {
	constructor(message = 'Conflict') {
		super(message, 409);
	}
}

export class BadRequestError extends AppError {
	constructor(message = 'Bad Request') {
		super(message, 400);
	}
}
