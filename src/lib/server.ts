import { createServer, type Server, type Socket } from 'node:net';

import * as v from 'valibot';

import { debug } from './debug.ts';

const RequestSchema = v.object({
	id: v.string(),
	args: v.array(v.string()),
});

export type CommandHandler = (
	args: readonly string[],
) => Promise<{ ok: boolean; data?: string; error?: string }>;

/**
 * starts a JSON-over-Unix-socket server.
 * each connection handles a single newline-delimited JSON request,
 * dispatches to the handler, writes the response, and closes.
 * @param socketPath path to the Unix domain socket
 * @param handler function that processes commands and returns responses
 * @returns promise that resolves with the server instance once listening
 */
export const startServer = (socketPath: string, handler: CommandHandler): Promise<Server> => {
	return new Promise((resolve, reject) => {
		const server = createServer((socket: Socket) => {
			let data = '';

			socket.on('data', (chunk: Buffer) => {
				data += chunk.toString();

				// process on first newline
				const newlineIndex = data.indexOf('\n');
				if (newlineIndex === -1) {
					return;
				}

				const line = data.slice(0, newlineIndex).trim();
				// ignore any further data on this connection
				data = '';

				handleRequest(line, socket, handler);
			});

			socket.on('error', (err) => {
				debug(`socket error: ${err.message}`);
			});
		});

		server.on('error', reject);

		server.listen(socketPath, () => {
			debug(`server listening on ${socketPath}`);
			resolve(server);
		});
	});
};

const handleRequest = async (line: string, socket: Socket, handler: CommandHandler): Promise<void> => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		debug(`ignoring malformed JSON: ${line}`);
		socket.end();
		return;
	}

	const result = v.safeParse(RequestSchema, parsed);
	if (!result.success) {
		debug(`ignoring invalid request: ${line}`);
		socket.end();
		return;
	}

	const { id, args } = result.output;

	try {
		debug(`request: ${line}`);

		const result = await handler(args);
		const response = JSON.stringify({ id, ...result });

		debug(`response: ${response}`);

		socket.end(response + '\n');
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		const response = JSON.stringify({ id, ok: false, error: message });

		debug(`handler error: ${message}`);
		socket.end(response + '\n');
	}
};
