import {
	argument,
	command,
	constant,
	type InferValue,
	integer,
	message,
	object,
	option,
	or,
	string,
} from '@optique/core';
import { withDefault } from '@optique/core/modifiers';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('wait'),
	subcommand: or(
		command(
			'for',
			object({
				kind: constant('for'),
				selector: argument(string({ metavar: 'SELECTOR' })),
				timeout: withDefault(
					option('--timeout', integer({ min: 0 }), { description: message`milliseconds to wait` }),
					5000,
				),
				hidden: withDefault(
					option('--hidden', { description: message`wait for the element to disappear` }),
					false,
				),
			}),
			{ description: message`wait for an element to appear` },
		),
		command(
			'for-text',
			object({
				kind: constant('for-text'),
				text: argument(string({ metavar: 'TEXT' })),
				timeout: withDefault(
					option('--timeout', integer({ min: 0 }), { description: message`milliseconds to wait` }),
					5000,
				),
				hidden: withDefault(
					option('--hidden', { description: message`wait for the text to disappear` }),
					false,
				),
			}),
			{ description: message`wait for text content to appear` },
		),
		command(
			'for-url',
			object({
				kind: constant('for-url'),
				pattern: argument(string({ metavar: 'URL_PATTERN' })),
				timeout: withDefault(
					option('--timeout', integer({ min: 0 }), { description: message`milliseconds to wait` }),
					5000,
				),
			}),
			{ description: message`wait for the URL to match a pattern` },
		),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const start = performance.now();
	const sub = args.subcommand;

	switch (sub.kind) {
		case 'for': {
			const waitState = sub.hidden ? 'hidden' : 'visible';
			await getLocator(state, sub.selector).waitFor({ state: waitState, timeout: sub.timeout });
			const elapsed = ((performance.now() - start) / 1000).toFixed(1);
			return `element ${sub.selector} is ${waitState} (${elapsed}s)`;
		}
		case 'for-text': {
			const waitState = sub.hidden ? 'hidden' : 'visible';
			await state.page.getByText(sub.text).waitFor({ state: waitState, timeout: sub.timeout });
			const elapsed = ((performance.now() - start) / 1000).toFixed(1);
			return `text "${sub.text}" is ${waitState} (${elapsed}s)`;
		}
		case 'for-url': {
			await state.page.waitForURL(sub.pattern, { timeout: sub.timeout });
			const elapsed = ((performance.now() - start) / 1000).toFixed(1);
			return `url matched ${sub.pattern} (${elapsed}s)`;
		}
	}
};
