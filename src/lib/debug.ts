export const debugEnabled = process.env.DEBUG === '1' || process.env.CBR_DEBUG === '1';

/**
 * logs a debug message to stderr if DEBUG=1 or CBR_DEBUG=1.
 * @param message the message to log
 */
export const debug = (message: string): void => {
	if (debugEnabled) {
		console.error(`[debug] ${message}`);
	}
};
