import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
// import { eq } from 'drizzle-orm';
import AppError, { UnauthorizedError } from '@/abstractions/AppError';
import { UserRole } from '@/database/schema';
import { PermissionsManagementService } from '@/modules/auth/services/permissions.service';
import { safeJwtVerify } from '@/utils/validations';

export type UserDetailsType = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	permissions: string[];
};

export type AccessTokenType = {
	userId: string;
	name: string;
	email: string;
	role: UserRole;
};

const protect = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const token =
			req.cookies['accessToken'] ??
			req.headers.authorization?.split(' ')[1];

		if (!token) {
			throw new UnauthorizedError('Authentication token missing');
		}

		const result = safeJwtVerify<AccessTokenType>(token);

		if (!result.success) {
			throw new AppError(
				'Authentication token missing',
				StatusCodes.UNAUTHORIZED,
			);
		}

		const decoded = result.data;

		// const [user] = await db
		// 	.select({
		// 		id: users.id,
		// 		name: users.name,
		// 		email: users.email,
		// 		roleId: users.roleId,
		// 		roleName: roles.name,
		// 	})
		// 	.from(users)
		// 	.leftJoin(authUsers, eq(authUsers.userId, users.id))
		// 	.innerJoin(roles, eq(roles.id, users.roleId))
		// 	.where(eq(users.id, decoded.userId))
		// 	.execute();

		// if (!user) {
		// 	throw new AppError(
		// 		'Invalid session, please login again',
		// 		StatusCodes.UNAUTHORIZED,
		// 	);
		// }

		// const userPermissions = await db
		// 	.select({ code: permissions.code })
		// 	.from(rolePermissions)
		// 	.innerJoin(
		// 		permissions,
		// 		eq(permissions.id, rolePermissions.permissionId),
		// 	)
		// 	.where(eq(rolePermissions.roleId, user.roleId))
		// 	.execute();

		const userDetails =
			await new PermissionsManagementService().getUserDetailsWithPermissions(
				decoded.userId,
			);

		if (!userDetails) {
			throw new AppError(
				'Invalid session, please login again',
				StatusCodes.UNAUTHORIZED,
			);
		}

		req.user_details = userDetails;

		next();
	} catch (err) {
		return next(err);
	}
};
export default protect;
