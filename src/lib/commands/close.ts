import { constant, object } from '@optique/core';

import type { BrowserState } from './_types.ts';

export const schema = object({
	command: constant('close'),
});

export const handler = async (state: BrowserState): Promise<string> => {
	await state.page.close();
	const pages = state.context.pages();
	if (pages.length > 0) {
		state.page = pages[0]!;
		return 'tab closed, switched to remaining tab';
	}
	return 'browser closed';
};
