import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { argument, constant, type InferValue, message, object, string } from '@optique/core';
import { optional } from '@optique/core/modifiers';

import { CommandError, type BrowserState } from './_types.ts';
import { filenameFromUrl, formatBytes } from './_utils.ts';

export const schema = object({
	command: constant('download'),
	url: argument(string({ metavar: 'URL' }), { description: message`URL of the resource to download` }),
	filename: optional(
		argument(string({ metavar: 'FILENAME' }), { description: message`save as this filename` }),
	),
});

export type Args = InferValue<typeof schema>;

export const handler = async (state: BrowserState, args: Args): Promise<string> => {
	const filename = args.filename ?? filenameFromUrl(args.url);

	const start = performance.now();
	const response = await state.page.request.get(args.url);
	if (!response.ok()) {
		throw new CommandError(`download failed: ${response.status()} ${response.statusText()}`);
	}

	const buffer = await response.body();
	const filepath = join(state.assetsDir, filename);
	await writeFile(filepath, buffer);

	const size = formatBytes(buffer.length);
	const elapsed = ((performance.now() - start) / 1000).toFixed(1);
	return `saved assets/${filename} (${size}, ${elapsed}s)`;
};
