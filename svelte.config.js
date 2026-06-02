export default {
	compilerOptions: {
		runes: false
	},
	onwarn(warning, defaultHandler) {
		const file = warning.filename?.replace(/\\/g, '/') ?? '';
		if (file.includes('vendor/open-webui')) {
			return;
		}
		defaultHandler(warning);
	}
};
