import { constant, type InferValue, integer, message, object, option, string } from '@optique/core';
import { optional, withDefault } from '@optique/core/modifiers';

import { takeSnapshot } from '../snapshot.ts';

import type { BrowserState } from './_types.ts';

export const schema = object({
	command: constant('snapshot'),
	interactive: withDefault(
		option('--interactive', { description: message`only show interactive elements` }),
		false,
	),
	compact: withDefault(
		option('--compact', { description: message`strip unnamed structural elements and prune empty branches` }),
		false,
	),
	text: withDefault(
		option('--text', { description: message`text-only mode: show content and refs without role labels` }),
		false,
	),
	depth: optional(option('--depth', integer({ min: 0 }), { description: message`maximum tree depth` })),
	selector: optional(option('--selector', string(), { description: message`scope to a subtree` })),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const result = await takeSnapshot(state.page, {
		interactive: args.interactive || undefined,
		compact: args.compact || undefined,
		text: args.text || undefined,
		depth: args.depth ?? undefined,
		selector: args.selector ?? undefined,
	});
	state.refs = result.refs;
	return result.text;
};
