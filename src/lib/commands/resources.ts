import { argument, constant, type InferValue, message, object, string } from '@optique/core';
import { optional } from '@optique/core/modifiers';

import type { BrowserState } from './_types.ts';
import { formatBytes } from './_utils.ts';

export const schema = object({
	command: constant('resources'),
	typeFilter: optional(
		argument(string({ metavar: 'TYPE' }), {
			description: message`filter by resource type (e.g. script, img)`,
		}),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const entries: Array<{ name: string; type: string; size: number }> = await state.page.evaluate(() =>
		performance.getEntriesByType('resource').map((e) => {
			const r = e as PerformanceResourceTiming;
			return { name: r.name, type: r.initiatorType, size: r.transferSize };
		}),
	);

	const filtered = args.typeFilter ? entries.filter((e) => e.type === args.typeFilter) : entries;

	if (filtered.length === 0) {
		return args.typeFilter ? `no resources of type "${args.typeFilter}"` : 'no resources recorded';
	}

	const lines = filtered.map((e) => {
		const size = e.size > 0 ? ` (${formatBytes(e.size)})` : '';
		return `[${e.type}] ${e.name}${size}`;
	});
	return lines.join('\n');
};
