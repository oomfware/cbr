import { argument, constant, type InferValue, message, object, string } from '@optique/core';
import { optional } from '@optique/core/modifiers';

import type { BrowserState } from './_types.ts';
import { getLocator } from './_utils.ts';

// browser evaluate callbacks run in the browser context where getComputedStyle exists
declare const getComputedStyle: (el: unknown) => { getPropertyValue(prop: string): string };

export const schema = object({
	command: constant('styles'),
	selector: argument(string({ metavar: 'SELECTOR' }), { description: message`element to inspect` }),
	property: optional(
		argument(string({ metavar: 'PROPERTY' }), {
			description: message`specific CSS property, or all if omitted`,
		}),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	if (args.property) {
		const value = await getLocator(state, args.selector).evaluate(
			(el, prop) => getComputedStyle(el).getPropertyValue(prop),
			args.property,
		);
		return value || '(empty)';
	}

	// return a curated set of commonly useful properties
	const styles = await getLocator(state, args.selector).evaluate((el) => {
		const cs = getComputedStyle(el);
		const props = [
			'color',
			'background-color',
			'font-family',
			'font-size',
			'font-weight',
			'line-height',
			'display',
			'position',
			'width',
			'height',
			'margin',
			'padding',
			'border',
			'opacity',
			'z-index',
		];
		const result: Record<string, string> = {};
		for (const p of props) {
			const v = cs.getPropertyValue(p);
			if (v) {
				result[p] = v;
			}
		}
		return result;
	});

	const lines = Object.entries(styles).map(([k, v]) => `${k}: ${v}`);
	return lines.join('\n');
};
