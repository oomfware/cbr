import { constant, object } from '@optique/core';

import type { BrowserState } from './_types.ts';

export const schema = object({
	command: constant('reload'),
});

export const handler = async (state: BrowserState): Promise<string> => {
	const start = performance.now();
	await state.page.reload({ waitUntil: 'domcontentloaded' });
	const elapsed = ((performance.now() - start) / 1000).toFixed(1);
	return `reloaded ${state.page.url()} (${elapsed}s)`;
};
