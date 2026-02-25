import { argument, constant, object, string } from '@optique/core';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('check'),
	selector: argument(string({ metavar: 'SELECTOR' })),
});

export const handler = async (state: BrowserState, args: { selector: string }): Promise<string> => {
	await getLocator(state, args.selector).check();
	return 'checked';
};
