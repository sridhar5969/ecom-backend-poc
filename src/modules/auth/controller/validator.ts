import { z } from 'zod/v4';

const Zerror = (issue: any, name: string, type: string) =>
	issue?.input === undefined
		? `${name} is required`
		: `${name} must be a ${type}`;

const EmailValidator = z
	.email({ error: (issue) => Zerror(issue, 'Email', 'email') })
	.trim();

const PasswordValidator = z.string({
	error: (issue) => Zerror(issue, 'Password', 'string'),
});

export const LoginWebPostParser = z.object({
	email: EmailValidator,
	password: PasswordValidator,
});

export const RegisterWebPostParser = z.object({
	firstName: z
		.string({
			error: (issue) => Zerror(issue, 'First Name', 'string'),
		})
		.min(1, 'First Name is required'),
	lastName: z
		.string({
			error: (issue) => Zerror(issue, 'Last Name', 'string'),
		})
		.min(1, 'Last Name is required'),
	email: EmailValidator,
	password: PasswordValidator.min(
		8,
		'Password must be at least 8 characters',
	),
});
