import { constant, type InferValue, message, object, passThrough } from '@optique/core';
import { optional } from '@optique/core/modifiers';

import { type BrowserState, CommandError } from './_types.ts';

export const schema = object({
	command: constant('eval'),
	code: optional(passThrough({ format: 'greedy', description: message`JavaScript code to evaluate` })),
});

export type Args = InferValue<typeof schema>;

export const handler = async (
	state: BrowserState,
	args: Args,
	stdin?: string,
): Promise<string | undefined> => {
	const code = stdin ?? args.code?.join(' ');
	if (!code) {
		throw new CommandError('missing code to evaluate');
	}

	const result = await state.page.evaluate(code);
	if (result === undefined || result === null) {
		return undefined;
	}
	return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
};
