import { argument, command, constant, type InferValue, message, object, or, string } from '@optique/core';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('get'),
	subcommand: or(
		command(
			'text',
			object({
				kind: constant('text'),
				selector: argument(string({ metavar: 'SELECTOR' })),
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
			}),
			{ description: message`get inner HTML of an element` },
		),
		command(
			'value',
			object({
				kind: constant('value'),
				selector: argument(string({ metavar: 'SELECTOR' })),
			}),
			{ description: message`get the value of an input field` },
		),
		command(
			'attr',
			object({
				kind: constant('attr'),
				selector: argument(string({ metavar: 'SELECTOR' })),
				attribute: argument(string({ metavar: 'ATTR' })),
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

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	switch (args.subcommand.kind) {
		case 'text': {
			return await getLocator(state, args.subcommand.selector).innerText();
		}
		case 'url': {
			return state.page.url();
		}
		case 'title': {
			return await state.page.title();
		}
		case 'html': {
			return await getLocator(state, args.subcommand.selector).innerHTML();
		}
		case 'value': {
			return await getLocator(state, args.subcommand.selector).inputValue();
		}
		case 'attr': {
			const value = await getLocator(state, args.subcommand.selector).getAttribute(args.subcommand.attribute);
			return value ?? '';
		}
		case 'count': {
			const count = await getLocator(state, args.subcommand.selector).count();
			return String(count);
		}
	}
};
