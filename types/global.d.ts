import { UserDetailsType } from '@/middleware/protect';

declare module 'express-serve-static-core' {
	interface Request {
		user_details: UserDetailsType;
	}
}
// types/global.d.ts
export {};

declare global {
	namespace NodeJS {
		// remove the existing `env` and re-add as `never`
		interface Process extends Omit<import('node:process').Process, 'env'> {
			env: never;
		}
	}
}
