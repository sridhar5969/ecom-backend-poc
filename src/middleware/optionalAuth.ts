import { NextFunction, Request, Response } from 'express';
import { AccessTokenType } from './protect';
import { UserRole } from '@/database/schema'; // Adjust path if needed
import { PermissionsManagementService } from '@/modules/auth/services/permissions.service';
import logger from '@/utils/logger/logger';
import { safeJwtVerify } from '@/utils/validations';

const optionalAuth = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		let token = req.cookies['accessToken'];

		// 1. Check for token in headers if not in cookies
		if (!token && req.headers.authorization?.startsWith('Bearer ')) {
			token = req.headers.authorization.split(' ')[1];
		}

		// 2. If no token found at all, strictly proceed as Guest
		if (!token) {
			return next();
		}

		// 3. Verify Token
		const result = safeJwtVerify<AccessTokenType>(token);

		if (!result.success) {
			// Token exists but is invalid or expired.
			// Do NOT throw error. Just ignore it and proceed as Guest.
			return next();
		}

		const decoded = result.data;

		// 4. Fetch User Details
		// We use a specific try-catch for the DB call to ensure that if the user
		// was deleted or DB is glitchy, the public page doesn't crash.
		try {
			const userDetails =
				await new PermissionsManagementService().getUserDetailsWithPermissions(
					decoded.userId,
				);

			// If user exists, attach details. If null, they proceed as guest.
			if (userDetails) {
				req.user_details = userDetails;
			}
		} catch (dbError) {
			// Optional: Log this warning so you know if DB lookups are failing
			console.warn(
				'OptionalAuth: Token valid but failed to fetch user details.',
				dbError,
			);
		}

		// 5. Proceed
		next();
	} catch (err) {
		// Failsafe: If any other error occurs, don't block the request.
		// Just let them through as a guest.
		logger.error(`OPTIONAL_AUTH_ERROR ${err}`);
		next();
	}
};

export default optionalAuth;
