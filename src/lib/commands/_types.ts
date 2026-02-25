import type { BrowserContext, Frame, Page } from 'playwright';
import type { Spinner } from 'yocto-spinner';

import type { RefMap } from '../snapshot.ts';

/** mutable state shared across commands within a session */
export interface BrowserState {
	context: BrowserContext;
	page: Page;
	refs: RefMap;
	frameRefs: Record<string, Frame>;
	assetsDir: string;
	screenshotDir: string;
	screenshotCounter: number;
	spinner: Spinner;
}

/** intentional, user-facing error thrown by command handlers */
export class CommandError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CommandError';
	}
}
