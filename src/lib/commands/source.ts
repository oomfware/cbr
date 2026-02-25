import { argument, constant, type InferValue, message, object, string } from '@optique/core';
import { optional } from '@optique/core/modifiers';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('source'),
	selector: optional(
		argument(string({ metavar: 'SELECTOR' }), {
			description: message`element to get HTML for, or full page if omitted`,
		}),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	if (args.selector) {
		return await getLocator(state, args.selector).evaluate((el) => el.outerHTML);
	}
	return await state.page.content();
};
