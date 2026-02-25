import { argument, constant, message, object, string } from '@optique/core';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('fill'),
	selector: argument(string({ metavar: 'SELECTOR' }), { description: message`input element to fill` }),
	text: argument(string({ metavar: 'TEXT' }), { description: message`text to fill in` }),
});

export const handler = async (
	state: BrowserState,
	args: { selector: string; text: string },
): Promise<string> => {
	await getLocator(state, args.selector).fill(args.text);
	return 'filled';
};
