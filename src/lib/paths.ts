import { randomUUID } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import * as v from 'valibot';

/**
 * returns the cache directory for cbr.
 * uses `$XDG_CACHE_HOME/cbr` if set, otherwise falls back to:
 * - `~/.cache/cbr` on linux
 * - `~/Library/Caches/cbr` on macos
 * @returns the cache directory path
 */
export const getCacheDir = (): string => {
	const xdgCache = process.env['XDG_CACHE_HOME'];
	if (xdgCache) {
		return join(xdgCache, 'cbr');
	}
	const home = homedir();
	if (process.platform === 'darwin') {
		return join(home, 'Library', 'Caches', 'cbr');
	}
	return join(home, '.cache', 'cbr');
};

/**
 * returns the sessions directory within the cache.
 * @returns the sessions directory path
 */
export const getSessionsDir = (): string => join(getCacheDir(), 'sessions');

const PID_FILE = '.pid';

// linux PID limits: 1 to 2^22 (4194304) by default, configurable up to 2^22
const PidSchema = v.pipe(v.string(), v.trim(), v.toNumber(), v.integer(), v.minValue(1));

/**
 * creates a new session directory with a random UUID, PID lockfile, and subdirectories.
 * @returns the path to the created session directory
 */
export const createSessionDir = async (): Promise<string> => {
	const sessionPath = join(getSessionsDir(), randomUUID());
	await mkdir(sessionPath, { recursive: true });
	await writeFile(join(sessionPath, PID_FILE), process.pid.toString());

	// create subdirectories
	await Promise.all([
		mkdir(join(sessionPath, '.claude'), { recursive: true }),
		mkdir(join(sessionPath, 'bin'), { recursive: true }),
		mkdir(join(sessionPath, 'assets'), { recursive: true }),
		mkdir(join(sessionPath, 'screenshots'), { recursive: true }),
		mkdir(join(sessionPath, 'scratch'), { recursive: true }),
	]);

	return sessionPath;
};

/**
 * removes a session directory.
 * @param sessionPath the session directory path
 */
export const cleanupSessionDir = async (sessionPath: string): Promise<void> => {
	await rm(sessionPath, { recursive: true, force: true });
};

/**
 * checks if a process with the given PID is running.
 * @param pid the process ID to check
 * @returns true if the process is running
 */
export const isProcessRunning = (pid: number): boolean => {
	try {
		// signal 0 doesn't send a signal but checks if process exists
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
};

/**
 * garbage collects orphaned session directories.
 * a session is orphaned if its PID file is missing or the process is no longer running.
 * this function is meant to be called fire-and-forget (errors are silently ignored).
 */
export const gcSessions = async (): Promise<void> => {
	const sessionsDir = getSessionsDir();

	let entries: Dirent[];
	try {
		entries = await readdir(sessionsDir, { withFileTypes: true });
	} catch {
		// sessions dir doesn't exist or can't be read
		return;
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}
		const sessionPath = join(sessionsDir, entry.name);
		const pidPath = join(sessionPath, PID_FILE);

		try {
			const pidContent = await readFile(pidPath, 'utf-8');
			const result = v.safeParse(PidSchema, pidContent);

			if (!result.success || !isProcessRunning(result.output)) {
				await rm(sessionPath, { recursive: true, force: true });
			}
		} catch {
			// no PID file or can't read it - orphaned session
			await rm(sessionPath, { recursive: true, force: true }).catch(() => {});
		}
	}
};
