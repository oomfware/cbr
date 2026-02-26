import {
	argument,
	command,
	constant,
	type InferValue,
	message,
	object,
	option,
	or,
	string,
} from '@optique/core';
import { withDefault } from '@optique/core/modifiers';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

// #region schema

const allFlag = withDefault(
	option('--all', { description: message`return results from all matching elements` }),
	false,
);

export const schema = object({
	command: constant('get'),
	subcommand: or(
		command(
			'text',
			object({
				kind: constant('text'),
				selector: argument(string({ metavar: 'SELECTOR' })),
				all: allFlag,
			}),
			{ description: message`get inner text of an element` },
		),
		command(
			'url',
			object({
				kind: constant('url'),
			}),
			{ description: message`get the current page URL` },
		),
		command(
			'title',
			object({
				kind: constant('title'),
			}),
			{ description: message`get the current page title` },
		),
		command(
			'html',
			object({
				kind: constant('html'),
				selector: argument(string({ metavar: 'SELECTOR' })),
				all: allFlag,
			}),
			{ description: message`get inner HTML of an element` },
		),
		command(
			'value',
			object({
				kind: constant('value'),
				selector: argument(string({ metavar: 'SELECTOR' })),
				all: allFlag,
			}),
			{ description: message`get the value of an input field` },
		),
		command(
			'attr',
			object({
				kind: constant('attr'),
				selector: argument(string({ metavar: 'SELECTOR' })),
				attribute: argument(string({ metavar: 'ATTR' })),
				all: allFlag,
			}),
			{ description: message`get an attribute of an element` },
		),
		command(
			'count',
			object({
				kind: constant('count'),
				selector: argument(string({ metavar: 'SELECTOR' })),
			}),
			{ description: message`count matching elements` },
		),
	),
});

// #endregion

export type Args = InferValue<typeof schema>;

/** collects results from all matching elements, one per line */
const allResults = async (
	state: BrowserState,
	selector: string,
	extract: (locator: import('playwright').Locator) => Promise<string>,
): Promise<string> => {
	const locators = await getLocator(state, selector).all();
	const results = await Promise.all(locators.map(extract));
	return results.join('\n');
};

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	switch (args.subcommand.kind) {
		case 'text': {
			if (args.subcommand.all) {
				return allResults(state, args.subcommand.selector, (l) => l.innerText());
			}
			return await getLocator(state, args.subcommand.selector).innerText();
		}
		case 'url': {
			return state.page.url();
		}
		case 'title': {
			return await state.page.title();
		}
		case 'html': {
			if (args.subcommand.all) {
				return allResults(state, args.subcommand.selector, (l) => l.innerHTML());
			}
			return await getLocator(state, args.subcommand.selector).innerHTML();
		}
		case 'value': {
			if (args.subcommand.all) {
				return allResults(state, args.subcommand.selector, (l) => l.inputValue());
			}
			return await getLocator(state, args.subcommand.selector).inputValue();
		}
		case 'attr': {
			const { attribute } = args.subcommand;
			if (args.subcommand.all) {
				return allResults(
					state,
					args.subcommand.selector,
					async (l) => (await l.getAttribute(attribute)) ?? '',
				);
			}
			const value = await getLocator(state, args.subcommand.selector).getAttribute(attribute);
			return value ?? '';
		}
		case 'count': {
			const count = await getLocator(state, args.subcommand.selector).count();
			return String(count);
		}
	}
};
