import { constant, object } from '@optique/core';

import { type BrowserState, CommandError } from './_types.ts';

export const schema = object({
	command: constant('close'),
});

export const handler = async (state: BrowserState): Promise<string> => {
	if (state.context.pages().length <= 1) {
		throw new CommandError(`can't close the last tab`);
	}

	await state.page.close();
	state.page = state.context.pages()[0]!;
	return 'tab closed, switched to remaining tab';
};
