import { join } from 'node:path';

import { argument, constant, type InferValue, message, object, option, string } from '@optique/core';
import { optional, withDefault } from '@optique/core/modifiers';

import type { BrowserState } from './_types.ts';

export const schema = object({
	command: constant('screenshot'),
	name: optional(
		argument(string({ metavar: 'NAME' }), { description: message`filename for the screenshot` }),
	),
	full: withDefault(option('--full', { description: message`capture the full scrollable page` }), false),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	state.screenshotCounter++;
	const name = args.name ?? `screenshot-${state.screenshotCounter}`;
	const filename = name.endsWith('.png') ? name : `${name}.png`;
	const filepath = join(state.screenshotDir, filename);

	await state.page.screenshot({ path: filepath, fullPage: args.full });
	return `screenshot saved to screenshots/${filename}`;
};
