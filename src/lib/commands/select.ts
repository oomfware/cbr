import { argument, constant, message, object, string } from '@optique/core';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('select'),
	selector: argument(string({ metavar: 'SELECTOR' }), { description: message`select element to target` }),
	value: argument(string({ metavar: 'VALUE' }), { description: message`option value to select` }),
});

export const handler = async (
	state: BrowserState,
	args: { selector: string; value: string },
): Promise<string> => {
	await getLocator(state, args.selector).selectOption(args.value);
	return `selected ${args.value}`;
};
