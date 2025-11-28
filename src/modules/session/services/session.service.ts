import { eq } from 'drizzle-orm';
import AppError from '@/abstractions/AppError';
import { db } from '@/database';
import { users, rolePermissions, permissions } from '@/database/schema';

export class SessionService {
	public async getProfile(userDetails: any) {
		// 1. Handle unauthenticated / missing ID
		if (!userDetails?.id) {
			// Option A: Throw error (if you want strict 401s)
			throw new AppError('Unauthorized', 401);

			// Option B: Return Guest structure immediately (matches your JSON requirement)
			// return {
			// 	userId: null,
			// 	userName: 'Guest',
			// 	userEmail: null,
			// 	roleId: null,
			// 	roleName: 'guest',
			// 	permissions: [],
			// 	isGuest: true,
			// };
		}

		// 2. Query User + Role + Permissions
		const rows = await db
			.select({
				user: {
					id: users.id,
					name: users.name,
					email: users.email,
					role: users.role,
				},
				permissionName: permissions.name, // Using the 'name' column from your schema
			})
			.from(users)
			.leftJoin(rolePermissions, eq(users.role, rolePermissions.role))
			.leftJoin(
				permissions,
				eq(rolePermissions.permissionId, permissions.id),
			)
			.where(eq(users.id, userDetails.id));

		if (!rows.length) {
			throw new AppError('User not found', 404);
		}

		// 3. Aggregate Permissions
		// We take the user data from the first row, then map over all rows to get permissions
		const currentUser = rows[0].user;

		const permissionsList = rows
			.map((r) => r.permissionName)
			.filter((p): p is string => p !== null); // Remove nulls if user has no permissions

		// 4. Return the specific shape required by frontend
		return {
			userId: currentUser.id,
			userName: currentUser.name,
			userEmail: currentUser.email,
			roleId: null, // Enum roles don't have numeric IDs
			roleName: currentUser.role,
			permissions: permissionsList,
			isGuest: false,
		};
	}
}
