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
