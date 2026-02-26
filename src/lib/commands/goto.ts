import { argument, constant, object, string } from '@optique/core';

import type { BrowserState } from './_types.ts';

export const schema = object({
	command: constant('goto'),
	url: argument(string({ metavar: 'URL' })),
});

export const handler = async (state: BrowserState, args: { url: string }): Promise<string> => {
	const start = performance.now();
	await state.page.goto(args.url, { waitUntil: 'domcontentloaded' });
	const elapsed = ((performance.now() - start) / 1000).toFixed(1);
	return `navigated to ${state.page.url()} (${elapsed}s)`;
};
