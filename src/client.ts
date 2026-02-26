#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { connect } from 'node:net';

const args = process.argv.slice(2);

// extract --socket flag
let socketPath: string | undefined;
const rest: string[] = [];

for (let i = 0; i < args.length; i++) {
	if (args[i] === '--socket' && i + 1 < args.length) {
		socketPath = args[++i];
	} else {
		rest.push(args[i]!);
	}
}

if (!socketPath) {
	console.error(`error: --socket is required`);
	process.exit(1);
}

if (rest.length === 0) {
	console.error(`usage: browser <command> [args...]`);
	process.exit(1);
}

/** reads all of stdin when input is piped, returns undefined for TTY */
const readStdin = (): Promise<string | undefined> => {
	if (process.stdin.isTTY) {
		return Promise.resolve(undefined);
	}

	return new Promise((resolve) => {
		let buf = '';
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (chunk) => {
			buf += chunk;
		});
		process.stdin.on('end', () => {
			const trimmed = buf.trim();
			resolve(trimmed || undefined);
		});
	});
};

const stdin = await readStdin();

const request = JSON.stringify({
	id: randomUUID(),
	args: rest,
	stdin,
});

const socket = connect(socketPath);
let data = '';

socket.on('connect', () => {
	socket.write(request + '\n');
});

socket.on('data', (chunk: Buffer) => {
	data += chunk.toString();
});

socket.on('end', () => {
	try {
		const response = JSON.parse(data.trim());
		if (response.ok) {
			if (response.data) {
				process.stdout.write(response.data);
				// ensure trailing newline
				if (!response.data.endsWith('\n')) {
					process.stdout.write('\n');
				}
			}
		} else {
			console.error(response.error ?? 'unknown error');
			process.exit(1);
		}
	} catch {
		console.error(`error: invalid response from server`);
		process.exit(1);
	}
});

socket.on('error', (err: Error) => {
	console.error(`error: could not connect to browser server: ${err.message}`);
	process.exit(1);
});
