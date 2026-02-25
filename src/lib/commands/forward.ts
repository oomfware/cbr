import { constant, object } from '@optique/core';

import type { BrowserState } from './_types.ts';

export const schema = object({
	command: constant('forward'),
});

export const handler = async (state: BrowserState): Promise<string> => {
	const start = performance.now();
	await state.page.goForward({ waitUntil: 'domcontentloaded' });
	const elapsed = ((performance.now() - start) / 1000).toFixed(1);
	return `navigated forward to ${state.page.url()} (${elapsed}s)`;
};
