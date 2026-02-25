import { argument, command, constant, type InferValue, message, object, or, string } from '@optique/core';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

export const schema = object({
	command: constant('is'),
	subcommand: or(
		command(
			'visible',
			object({
				kind: constant('visible'),
				selector: argument(string({ metavar: 'SELECTOR' })),
			}),
			{ description: message`check if an element is visible` },
		),
		command(
			'enabled',
			object({
				kind: constant('enabled'),
				selector: argument(string({ metavar: 'SELECTOR' })),
			}),
			{ description: message`check if an element is enabled` },
		),
		command(
			'checked',
			object({
				kind: constant('checked'),
				selector: argument(string({ metavar: 'SELECTOR' })),
			}),
			{ description: message`check if a checkbox is checked` },
		),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	switch (args.subcommand.kind) {
		case 'visible': {
			const visible = await getLocator(state, args.subcommand.selector).isVisible();
			return String(visible);
		}
		case 'enabled': {
			const enabled = await getLocator(state, args.subcommand.selector).isEnabled();
			return String(enabled);
		}
		case 'checked': {
			const checked = await getLocator(state, args.subcommand.selector).isChecked();
			return String(checked);
		}
	}
};
