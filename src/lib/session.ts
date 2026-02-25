import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * writes the per-session `.claude/settings.json` with permissions and hooks.
 * paths are baked in at generation time so the settings work regardless of cwd.
 * @param sessionPath the session directory path
 */
export const writeSessionSettings = async (sessionPath: string): Promise<void> => {
	const settings = {
		permissions: {
			allow: [
				'Read(assets/*)',
				'Read(screenshots/*)',
				'Read(scratch/*)',
				'Write(scratch/*)',
				'Glob(assets/*)',
				'Glob(screenshots/*)',
				'Glob(scratch/*)',
				'Grep(assets/*)',
				'Grep(screenshots/*)',
				'Grep(scratch/*)',
				'Bash(browser:*)',
				// filesystem
				'Bash(ls:*)',
				'Bash(cat:*)',
				'Bash(head:*)',
				'Bash(tail:*)',
				'Bash(wc:*)',
				'Bash(file:*)',
				'Bash(find:*)',
				'Bash(tree:*)',
				'Bash(stat:*)',
				'Bash(du:*)',
				'Bash(mkdir:*)',
				'Bash(basename:*)',
				'Bash(dirname:*)',
				'Bash(realpath:*)',

				// text processing
				'Bash(awk:*)',
				'Bash(cut:*)',
				'Bash(diff:*)',
				'Bash(grep:*)',
				'Bash(jq:*)',
				'Bash(sed:*)',
				'Bash(sort:*)',
				'Bash(tr:*)',
				'Bash(uniq:*)',
				'Bash(xargs:*)',
				'Bash(paste:*)',
				'Bash(tee:*)',
				'Bash(column:*)',
				'WebSearch',
				'WebFetch',
			],
			deny: ['*'],
		},
		hooks: {
			SessionStart: [
				{
					matcher: '',
					hooks: [
						{
							type: 'command',
							command: `sh -c 'echo "export PATH=\\"${sessionPath}/bin:\\$PATH\\"" >> "$CLAUDE_ENV_FILE"'`,
						},
					],
				},
			],
		},
	};

	await writeFile(join(sessionPath, '.claude', 'settings.json'), JSON.stringify(settings, null, '\t') + '\n');
};

/**
 * writes the `bin/browser` shim script that delegates to the bundled client.
 * @param sessionPath the session directory path
 * @param clientScriptPath absolute path to the bundled `dist/browser.mjs`
 * @param socketPath absolute path to the Unix domain socket
 */
export const writeBrowserShim = async (
	sessionPath: string,
	clientScriptPath: string,
	socketPath: string,
): Promise<void> => {
	const shimPath = join(sessionPath, 'bin', 'browser');
	const content = `#!/bin/sh\nexec node ${clientScriptPath} --socket ${socketPath} "$@"\n`;
	await writeFile(shimPath, content);
	await chmod(shimPath, 0o755);
};
