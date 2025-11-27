import { eq } from 'drizzle-orm';
import { db } from '@/database';
import {
	permissions,
	rolePermissions,
	UserRole,
	users,
} from '@/database/schema';
import { UserDetailsType } from '@/middleware/protect';

export class PermissionsManagementService {
	async getPermissionByRole(role: UserRole) {
		const rolePerms = await db
			.select({
				name: permissions.name,
			})
			.from(rolePermissions)
			.where(eq(rolePermissions.role, role))
			.innerJoin(
				permissions,
				eq(rolePermissions.permissionId, permissions.id),
			);
		return rolePerms.map((rp) => rp.name);
	}

	async getAllPermissions(): Promise<
		{ role: string; permissions: string[] }[]
	> {
		const data = await db
			.select()
			.from(rolePermissions)
			.innerJoin(
				permissions,
				eq(rolePermissions.permissionId, permissions.id),
			);
		const permissionsByRole = data.map((role) => {
			return {
				role: role.role_permissions.role,
				permissions: data.map((rp) => rp.permissions.name),
			};
		});
		return permissionsByRole;
	}

	async getUserDetailsWithPermissions(
		userId: string,
	): Promise<UserDetailsType> {
		const userData = await db
			.select({
				id: rolePermissions.role,
				permission: permissions.name,
				role: users.role,
				name: users.name,
				email: users.email,
			})
			.from(rolePermissions)
			.innerJoin(
				permissions,
				eq(rolePermissions.permissionId, permissions.id),
			)
			.innerJoin(users, eq(users.role, rolePermissions.role))
			.where(eq(users.id, userId));
		return {
			id: userId,
			role: userData[0].role,
			permissions: userData.map((ud) => ud.permission),
			email: userData[0].email,
			name: userData[0].name,
		};
	}
}
