import { argument, command, constant, type InferValue, message, object, or, string } from '@optique/core';
import type { Frame, Page } from 'playwright';

import { type BrowserState, CommandError } from './_types.ts';

export const schema = object({
	command: constant('frame'),
	subcommand: or(
		command(
			'list',
			object({
				kind: constant('list'),
			}),
			{ description: message`list all frames with IDs, URLs, and parent info` },
		),
		command(
			'main',
			object({
				kind: constant('main'),
			}),
			{ description: message`switch to the main frame` },
		),
		// `frame <id>` — switch by frame ref (positional, no subcommand keyword)
		object({
			kind: constant('switch'),
			id: argument(string({ metavar: 'FRAME_ID' }), { description: message`frame ref to switch to` }),
		}),
	),
});

export type Args = InferValue<typeof schema>;

/**
 * collects child frames from the page, assigns IDs (`f1`, `f2`, ...), and
 * stores them in `state.frameRefs`. the main frame is excluded since
 * `frame main` handles switching back to it.
 */
const refreshFrameRefs = (state: BrowserState): Record<string, Frame> => {
	const mainPage = state.context.pages()[0]!;
	const mainFrame = mainPage.mainFrame();
	const childFrames = mainPage.frames().filter((f) => f !== mainFrame);
	const map: Record<string, Frame> = {};
	for (let i = 0; i < childFrames.length; i++) {
		map[`f${i + 1}`] = childFrames[i]!;
	}
	state.frameRefs = map;
	return map;
};

const formatFrameList = (refs: Record<string, Frame>, currentPage: Page): string => {
	const mainFrame = currentPage.mainFrame();
	const currentFrame = currentPage as unknown as Frame;
	const lines: string[] = [];

	{
		const marker = currentFrame === mainFrame ? '* ' : '  ';
		lines.push(`${marker}main: ${mainFrame.url()}`);
	}

	for (const [id, frame] of Object.entries(refs)) {
		const marker = frame === currentFrame ? '* ' : '  ';
		const name = frame.name() ? ` name="${frame.name()}"` : '';

		let parentTag = '';
		{
			const parent = frame.parentFrame();
			if (parent === mainFrame) {
				parentTag = ' (parent: main)';
			} else if (parent) {
				const parentId = Object.entries(refs).find(([, f]) => f === parent)?.[0];
				if (parentId) {
					parentTag = ` (parent: ${parentId})`;
				}
			}
		}

		lines.push(`${marker}${id}: ${frame.url()}${name}${parentTag}`);
	}
	return lines.join('\n');
};

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const sub = args.subcommand;

	switch (sub.kind) {
		case 'list': {
			const refs = refreshFrameRefs(state);
			return formatFrameList(refs, state.page);
		}
		case 'main': {
			state.page = state.context.pages()[0]!;
			return 'switched to main frame';
		}
		case 'switch': {
			const frame = state.frameRefs[sub.id];
			if (!frame) {
				throw new CommandError(
					`frame ${sub.id} not found — run \`browser frame list\` to list frames and get IDs`,
				);
			}
			// Frame implements a subset of Page's API that we use
			state.page = frame as unknown as Page;
			return `switched to frame ${sub.id}: ${frame.url()}`;
		}
	}
};
