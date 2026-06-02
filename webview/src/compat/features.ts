import { getCompatConfig, isFeatureEnabled } from './config';

export function getFeatureFlags(): Record<string, boolean> {
	return { ...getCompatConfig().features };
}

export { isFeatureEnabled };
