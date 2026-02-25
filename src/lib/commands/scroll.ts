import { argument, choice, constant, type InferValue, message, object, string } from '@optique/core';
import { optional } from '@optique/core/modifiers';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('scroll'),
	direction: argument(choice(['up', 'down']), { description: message`scroll direction` }),
	selector: optional(
		argument(string({ metavar: 'SELECTOR' }), {
			description: message`element to scroll instead of the page`,
		}),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const delta = args.direction === 'down' ? 500 : -500;

	if (args.selector) {
		const locator = getLocator(state, args.selector);
		await locator.evaluate((el, d) => el.scrollBy(0, d), delta);
	} else {
		await state.page.mouse.wheel(0, delta);
	}

	return `scrolled ${args.direction}`;
};
