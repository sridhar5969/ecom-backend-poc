import { relations } from 'drizzle-orm';
import { pgTable, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { permissions } from './system';
import { userRoleEnum } from './_Enums';

export const rolePermissions = pgTable(
	'role_permissions',
	{
		role: userRoleEnum('role'),
		permissionId: uuid('permission_id').references(() => permissions.id),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.role, t.permissionId] }),
	}),
);

export const rolePermissionsRelations = relations(
	rolePermissions,
	({ one }) => ({
		permission: one(permissions, {
			fields: [rolePermissions.permissionId],
			references: [permissions.id],
		}),
	}),
);
