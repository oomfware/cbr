import { argument, constant, object, string } from '@optique/core';

import type { BrowserState } from './_types.ts';

export const schema = object({
	command: constant('press'),
	key: argument(string({ metavar: 'KEY' })),
});

export const handler = async (state: BrowserState, args: { key: string }): Promise<string> => {
	await state.page.keyboard.press(args.key);
	return `pressed ${args.key}`;
};
