import { argument, constant, message, object, string } from '@optique/core';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('type'),
	selector: argument(string({ metavar: 'SELECTOR' }), { description: message`element to type into` }),
	text: argument(string({ metavar: 'TEXT' }), { description: message`text to type` }),
});

export const handler = async (
	state: BrowserState,
	args: { selector: string; text: string },
): Promise<string> => {
	await getLocator(state, args.selector).pressSequentially(args.text);
	return 'typed';
};
