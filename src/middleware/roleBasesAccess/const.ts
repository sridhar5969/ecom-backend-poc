export const ModuleEnum = Object.freeze({
	LEADS_MANAGEMENT: 'leads_management',
	USERS_MANAGEMENT: 'usersmanagement',
} as const);

export type ModuleEnumType = (typeof ModuleEnum)[keyof typeof ModuleEnum];
