import { NextFunction, Request, Response } from 'express';
import { z } from 'zod/v4';
import { PermissionsManagementService } from '@/core/auth/services/permissions.service';
import logger from '@/utils/logger/logger';

export const RoleModuleAccessSchema = z.array(
	z.object({
		roleId: z.number().int().nonnegative(),
		roleName: z.string().min(1),
		permission: z.string().min(1),
	}),
);

export class RoleBaseAccess {
	private static roleModule: Map<string, Set<string>> = new Map();
	private static intervalId: NodeJS.Timeout;

	private static async getRoleModuleData() {
		try {
			logger.info(
				'[RoleBaseAccess] Refreshing role-module access data...',
			);
			const data =
				await new PermissionsManagementService().getAllPermissions();

			// Clear existing data
			this.roleModule.clear();

			// Build the role-module map from database data
			const roleModuleMap = new Map<string, Set<string>>();

			data.forEach((role) => {
				if (role.permissions && role.permissions.length > 0) {
					const permissionSet = new Set<string>(role.permissions);
					roleModuleMap.set(role.role, permissionSet);
				}
			});

			this.roleModule = roleModuleMap;

			logger.info(
				`[RoleBaseAccess] Loaded ${this.roleModule.size} roles with permissions`,
			);
		} catch (err) {
			logger.error('Role-based access failed', err);
		}
	}

	static init(intervalMs: number = 10 * 60 * 1000) {
		this.getRoleModuleData();
		this.intervalId = setInterval(
			() => this.getRoleModuleData(),
			intervalMs,
		);
		logger.info('[RoleBaseAccess] Interval started');
	}

	static stopIt() {
		if (this.intervalId) clearInterval(this.intervalId);
		logger.info('[RoleBaseAccess] Interval stopped');
	}

	static checkAccess(role: string, keyword: string): boolean {
		const modules = this.roleModule.get(role);
		if (!modules) return false;
		if (!modules.has(keyword)) return false;
		return true;
	}

	static middleware(keyword: string) {
		return (req: Request, res: Response, next: NextFunction) => {
			const role = req.user_details.role;
			if (!role || !RoleBaseAccess.checkAccess(role, keyword)) {
				return res
					.status(403)
					.json({ message: 'Forbidden: Access Denied' });
			}
			next();
		};
	}
}

export default RoleBaseAccess;
