import { basename } from 'node:path';

import type { Locator } from 'playwright';

import { resolveLocator } from '../snapshot.ts';

import type { BrowserState } from './_types.ts';

/** resolves a ref or CSS selector to a Playwright locator */
export const getLocator = (state: BrowserState, selectorOrRef: string): Locator => {
	return resolveLocator(state.page, selectorOrRef, state.refs);
};

/** formats a byte count into a human-readable string */
export const formatBytes = (bytes: number): string => {
	if (bytes === 0) {
		return '0 B';
	}
	const units = ['B', 'KB', 'MB', 'GB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** i;
	return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
};

/** extracts a filename from a URL, falling back to a generic name */
export const filenameFromUrl = (url: string): string => {
	try {
		const pathname = new URL(url).pathname;
		const base = basename(pathname);
		// strip query params that might sneak in and ensure it's a valid filename
		if (base && base !== '/' && !base.startsWith('.')) {
			return base.split('?')[0]!;
		}
	} catch {
		// invalid URL — fall through
	}
	return 'download';
};
