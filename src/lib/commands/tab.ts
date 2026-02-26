import {
	argument,
	command,
	constant,
	type InferValue,
	integer,
	message,
	object,
	or,
	string,
} from '@optique/core';
import { optional } from '@optique/core/modifiers';

import { type BrowserState, CommandError } from './_types.ts';

export const schema = object({
	command: constant('tab'),
	subcommand: or(
		command(
			'list',
			object({
				kind: constant('list'),
			}),
			{ description: message`list open tabs` },
		),
		command(
			'new',
			object({
				kind: constant('new'),
				url: optional(
					argument(string({ metavar: 'URL' }), { description: message`URL to open in the new tab` }),
				),
			}),
			{ description: message`open a new tab and switch to it` },
		),
		command(
			'close',
			object({
				kind: constant('close'),
				index: optional(argument(integer({ min: 0 }), { description: message`tab index to close` })),
			}),
			{ description: message`close a tab` },
		),
		// `tab <n>` — switch to tab by index (positional, no subcommand keyword)
		object({
			kind: constant('switch'),
			index: argument(integer({ min: 0 }), { description: message`tab index to switch to` }),
		}),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const sub = args.subcommand;

	switch (sub.kind) {
		case 'list': {
			const pages = state.context.pages();
			const lines = pages.map((p, i) => {
				const marker = p === state.page ? '* ' : '  ';
				return `${marker}${i}: ${p.url()}`;
			});
			return lines.join('\n');
		}
		case 'new': {
			const newPage = await state.context.newPage();
			if (sub.url) {
				await newPage.goto(sub.url, { waitUntil: 'domcontentloaded' });
			}
			state.page = newPage;
			return `opened new tab${sub.url ? ` at ${sub.url}` : ''}`;
		}
		case 'close': {
			const pages = state.context.pages();

			if (pages.length <= 1) {
				throw new CommandError(`can't close the last tab`);
			}

			if (sub.index !== undefined) {
				if (sub.index >= pages.length) {
					throw new CommandError(`invalid tab index: ${sub.index}`);
				}
				await pages[sub.index]!.close();
				// if we closed the current tab, switch to the first available
				if (!state.context.pages().includes(state.page)) {
					state.page = state.context.pages()[0]!;
				}
			} else {
				await state.page.close();
				state.page = state.context.pages()[0]!;
			}
			return 'tab closed';
		}
		case 'switch': {
			const pages = state.context.pages();
			if (sub.index < 0 || sub.index >= pages.length) {
				throw new CommandError(`tab index out of range: ${sub.index} (${pages.length} tabs open)`);
			}
			state.page = pages[sub.index]!;
			await state.page.bringToFront();
			return `switched to tab ${sub.index}: ${state.page.url()}`;
		}
	}
};
