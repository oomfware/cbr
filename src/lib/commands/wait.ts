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

const timeoutOption = withDefault(
	option('--timeout', integer({ min: 0 }), { description: message`milliseconds to wait` }),
	5000,
);

export const schema = object({
	command: constant('wait'),
	subcommand: or(
		command(
			'for',
			object({
				kind: constant('for'),
				selector: argument(string({ metavar: 'SELECTOR' })),
				timeout: timeoutOption,
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
				timeout: timeoutOption,
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
				timeout: timeoutOption,
			}),
			{ description: message`wait for the URL to match a pattern` },
		),
		command(
			'for-load',
			object({
				kind: constant('for-load'),
				timeout: timeoutOption,
			}),
			{ description: message`wait for all resources to finish loading` },
		),
		command(
			'for-idle',
			object({
				kind: constant('for-idle'),
				timeout: timeoutOption,
			}),
			{ description: message`wait for network activity to settle (no requests for 500ms)` },
		),
		command(
			'for-response',
			object({
				kind: constant('for-response'),
				pattern: argument(string({ metavar: 'URL_PATTERN' })),
				timeout: timeoutOption,
			}),
			{ description: message`wait for a network response matching a URL pattern` },
		),
	),
});

export type Args = InferValue<typeof schema>;

const formatElapsed = (start: number): string => ((performance.now() - start) / 1000).toFixed(1);

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const start = performance.now();
	const sub = args.subcommand;

	switch (sub.kind) {
		case 'for': {
			const waitState = sub.hidden ? 'hidden' : 'visible';
			await getLocator(state, sub.selector).waitFor({ state: waitState, timeout: sub.timeout });
			return `element ${sub.selector} is ${waitState} (${formatElapsed(start)}s)`;
		}
		case 'for-text': {
			const waitState = sub.hidden ? 'hidden' : 'visible';
			await state.page.getByText(sub.text).waitFor({ state: waitState, timeout: sub.timeout });
			return `text "${sub.text}" is ${waitState} (${formatElapsed(start)}s)`;
		}
		case 'for-url': {
			await state.page.waitForURL(sub.pattern, { timeout: sub.timeout });
			return `url matched ${sub.pattern} (${formatElapsed(start)}s)`;
		}
		case 'for-load': {
			await state.page.waitForLoadState('load', { timeout: sub.timeout });
			return `page loaded (${formatElapsed(start)}s)`;
		}
		case 'for-idle': {
			await state.page.waitForLoadState('networkidle', { timeout: sub.timeout });
			return `network idle (${formatElapsed(start)}s)`;
		}
		case 'for-response': {
			const response = await state.page.waitForResponse((resp) => resp.url().includes(sub.pattern), {
				timeout: sub.timeout,
			});
			return `response ${response.status()} from ${response.url()} (${formatElapsed(start)}s)`;
		}
	}
};
