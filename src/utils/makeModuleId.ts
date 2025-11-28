export function makeModuleId(projectId: number, index: number) {
	// index → a, b, c … z, aa, ab … if more than 26 modules
	let suffix = '';
	let i = index;
	while (i >= 0) {
		suffix = String.fromCharCode((i % 26) + 97) + suffix;
		i = Math.floor(i / 26) - 1;
	}
	return `${projectId}:${suffix}`;
}
