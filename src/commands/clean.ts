import { constant, type InferValue, object } from '@optique/core';

import { gcSessions } from '../lib/paths.ts';

export const schema = object({
	command: constant('clean'),
});

export type Args = InferValue<typeof schema>;

/**
 * handles the clean command.
 * garbage collects orphaned session directories.
 * @param _args parsed command arguments
 */
export const handler = async (_args: Args): Promise<void> => {
	await gcSessions();
};
