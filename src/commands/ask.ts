import { type ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';

import {
	argument,
	choice,
	constant,
	flag,
	type InferValue,
	message,
	object,
	option,
	string,
} from '@optique/core';
import { optional, withDefault } from '@optique/core/modifiers';
import { type Browser, chromium } from 'playwright';
import yoctoSpinner from 'yocto-spinner';

import { createCommandHandler } from '../lib/commands.ts';
import type { BrowserState } from '../lib/commands/_types.ts';
import { cleanupSessionDir, createSessionDir, gcSessions } from '../lib/paths.ts';
import { startServer } from '../lib/server.ts';
import { writeBrowserShim, writeSessionSettings } from '../lib/session.ts';

// resolve asset paths relative to the bundle (dist/index.mjs -> dist/assets/)
const assetsDir = join(import.meta.dirname, 'assets');
const systemPromptPath = join(assetsDir, 'system-prompt.md');

// client script lives next to index.mjs in dist/
const clientScriptPath = join(import.meta.dirname, 'client.mjs');

export const schema = object({
	command: constant('ask'),
	model: withDefault(
		option('-m', '--model', choice(['opus', 'sonnet', 'haiku']), {
			description: message`model to use`,
		}),
		'sonnet',
	),
	headful: withDefault(
		flag('--headful', {
			description: message`show browser window (default: headless)`,
		}),
		false,
	),
	url: optional(
		option('--url', string(), {
			description: message`starting URL to navigate to`,
		}),
	),
	task: argument(string({ metavar: 'TASK' }), {
		description: message`what to accomplish in the browser`,
	}),
});

export type Args = InferValue<typeof schema>;

/**
 * spawns Claude Code as a child process.
 * @param cwd working directory
 * @param args command arguments
 * @param contextPrompt additional context to append to the system prompt
 * @returns the child process
 */
const spawnClaude = (cwd: string, args: Args, contextPrompt: string): ChildProcess => {
	const claudeArgs = [
		'-p',
		args.task,
		'--no-session-persistence',
		'--model',
		args.model,
		'--system-prompt-file',
		systemPromptPath,
		'--append-system-prompt',
		contextPrompt,
	];

	return spawn('claude', claudeArgs, {
		cwd,
		stdio: ['ignore', 'pipe', 'inherit'],
		env: { ...process.env, CLAUDECODE: '' },
	});
};

/**
 * waits for a child process to exit, collecting its stdout.
 * @param child the child process
 * @returns promise that resolves with exit code and collected stdout
 */
const waitForExit = (child: ChildProcess): Promise<{ code: number; stdout: string }> => {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		child.stdout?.on('data', (chunk: Buffer) => {
			chunks.push(chunk);
		});
		child.on('close', (code) => resolve({ code: code ?? 0, stdout: Buffer.concat(chunks).toString() }));
		child.on('error', (err) => reject(new Error(`failed to summon claude: ${err}`)));
	});
};

/**
 * handles the ask command.
 * launches a browser, starts the IPC server, and spawns Claude Code.
 * @param args parsed command arguments
 */
export const handler = async (args: Args): Promise<void> => {
	// fire-and-forget cleanup of orphaned sessions
	gcSessions();

	// create session directory with subdirectories
	const sessionPath = await createSessionDir();
	const socketPath = join(sessionPath, '.sock');
	let exitCode = 1;
	let claudeOutput = '';
	let browser: Browser | undefined;
	let claude: ChildProcess | undefined;

	// handle Ctrl+C — kill child, clean up, and exit
	const onSignal = () => {
		if (claude) {
			claude.kill('SIGTERM');
		}
		spin.stop('interrupted');
		if (browser) {
			browser.close().catch(() => {});
		}
		cleanupSessionDir(sessionPath).finally(() => {
			process.exit(130);
		});
	};
	process.on('SIGINT', onSignal);
	process.on('SIGTERM', onSignal);

	const spin = yoctoSpinner({
		text: args.headful ? 'launching browser (headful)' : 'launching browser',
	}).start();

	try {
		browser = await chromium.launch({ headless: !args.headful });
		const context = await browser.newContext();
		const page = await context.newPage();

		// navigate to starting URL if provided
		if (args.url) {
			spin.text = `navigating to ${args.url}`;
			await page.goto(args.url, { waitUntil: 'domcontentloaded' });
		}

		// set up browser state — spinner is shared so commands can update it
		const state: BrowserState = {
			context,
			page,
			refs: {},
			frameRefs: {},
			assetsDir: join(sessionPath, 'assets'),
			screenshotDir: join(sessionPath, 'screenshots'),
			screenshotCounter: 0,
			spinner: spin,
		};

		// start IPC server
		spin.text = 'starting session';
		const cmdHandler = createCommandHandler(state);
		const server = await startServer(socketPath, cmdHandler);

		// write session files
		await writeBrowserShim(sessionPath, clientScriptPath, socketPath);
		await writeSessionSettings(sessionPath);

		// build context prompt
		const contextParts: string[] = [];
		if (args.url) {
			contextParts.push(`The browser is already open at: ${args.url}`);
		}
		const contextPrompt = contextParts.length > 0 ? contextParts.join('\n') : '';

		spin.text = 'summoning claude';

		// spawn Claude Code — stdout is piped and printed after cleanup
		claude = spawnClaude(sessionPath, args, contextPrompt);
		const result = await waitForExit(claude);
		exitCode = result.code;
		claudeOutput = result.stdout;

		// teardown
		server.close();
	} finally {
		process.off('SIGINT', onSignal);
		process.off('SIGTERM', onSignal);
		spin.stop();

		if (browser) {
			await browser.close().catch(() => {});
		}
		await cleanupSessionDir(sessionPath);
	}

	if (claudeOutput) {
		process.stdout.write(claudeOutput);
	}
	process.exit(exitCode);
};
