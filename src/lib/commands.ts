import { command, formatDocPage, formatMessage, getDocPage, group, message, or, parse } from '@optique/core';

import { type BrowserState, CommandError } from './commands/_types.ts';
import * as back from './commands/back.ts';
import * as check from './commands/check.ts';
import * as click from './commands/click.ts';
import * as close from './commands/close.ts';
import * as dblclick from './commands/dblclick.ts';
import * as download from './commands/download.ts';
import * as eval_ from './commands/eval.ts';
import * as fill from './commands/fill.ts';
import * as forward from './commands/forward.ts';
import * as frame from './commands/frame.ts';
import * as get from './commands/get.ts';
import * as hover from './commands/hover.ts';
import * as is_ from './commands/is.ts';
import * as open from './commands/open.ts';
import * as press from './commands/press.ts';
import * as reload from './commands/reload.ts';
import * as resources from './commands/resources.ts';
import * as screenshot from './commands/screenshot.ts';
import * as scroll from './commands/scroll.ts';
import * as select from './commands/select.ts';
import * as snapshot from './commands/snapshot.ts';
import * as source from './commands/source.ts';
import * as styles from './commands/styles.ts';
import * as tab from './commands/tab.ts';
import * as typeText from './commands/type-text.ts';
import * as uncheck from './commands/uncheck.ts';
import * as wait from './commands/wait.ts';
import type { CommandHandler } from './server.ts';

// grouped to stay within or()'s typed overloads (max 10 per call)
const navigation = group(
	'navigation',
	or(
		command('open', open.schema, { description: message`navigate to a URL` }),
		command('back', back.schema, { description: message`go back in history` }),
		command('forward', forward.schema, { description: message`go forward in history` }),
		command('reload', reload.schema, { description: message`reload the current page` }),
		command('click', click.schema, { description: message`click an element` }),
		command('dblclick', dblclick.schema, { description: message`double-click an element` }),
		command('fill', fill.schema, { description: message`clear and fill an input field` }),
		command('type', typeText.schema, { description: message`type text character by character` }),
		command('press', press.schema, { description: message`press a keyboard key` }),
	),
);

const querying = group(
	'querying',
	or(
		command('hover', hover.schema, { description: message`hover over an element` }),
		command('select', select.schema, { description: message`select a dropdown option` }),
		command('check', check.schema, { description: message`check a checkbox` }),
		command('uncheck', uncheck.schema, { description: message`uncheck a checkbox` }),
		command('get', get.schema, { description: message`get page or element data` }),
		command('is', is_.schema, { description: message`check element state` }),
		command('snapshot', snapshot.schema, { description: message`get the accessibility tree` }),
		command('screenshot', screenshot.schema, { description: message`take a screenshot` }),
		command('wait', wait.schema, { description: message`wait for an element, text, or URL` }),
	),
);

const inspection = group(
	'inspection',
	or(
		command('scroll', scroll.schema, { description: message`scroll the page or a container` }),
		command('frame', frame.schema, { description: message`list or switch frames` }),
		command('tab', tab.schema, { description: message`list, open, switch, or close tabs` }),
		command('eval', eval_.schema, { description: message`evaluate JavaScript in the page` }),
		command('source', source.schema, { description: message`get page or element HTML source` }),
		command('resources', resources.schema, { description: message`list loaded resources` }),
		command('styles', styles.schema, { description: message`get computed styles for an element` }),
		command('download', download.schema, { description: message`download a resource to assets/` }),
		command('close', close.schema, { description: message`close the current tab` }),
	),
);

export const parser = or(navigation, querying, inspection);

/**
 * creates a command handler that parses args and dispatches to the matching command.
 * @param state mutable browser state shared across commands
 * @returns a command handler compatible with the server
 */
export const createCommandHandler =
	(state: BrowserState): CommandHandler =>
	async (args) => {
		if (args[0] === 'help' || args[0] === '--help') {
			const helpArgs = args.slice(1);
			const page = getDocPage(parser, helpArgs);
			if (page) {
				return { ok: true, data: formatDocPage('browser', page) };
			}
			return { ok: false, error: `no help available` };
		}

		if (state.spinner.isSpinning) {
			state.spinner.text = ['browser', ...args].join(' ').replace(/\s+/g, ' ');
		}

		const parsed = parse(parser, args);
		if (!parsed.success) {
			return { ok: false, error: formatMessage(parsed.error) };
		}

		try {
			let data: string | undefined;

			switch (parsed.value.command) {
				case 'open':
					data = await open.handler(state, parsed.value);
					break;
				case 'back':
					data = await back.handler(state);
					break;
				case 'forward':
					data = await forward.handler(state);
					break;
				case 'reload':
					data = await reload.handler(state);
					break;
				case 'click':
					data = await click.handler(state, parsed.value);
					break;
				case 'dblclick':
					data = await dblclick.handler(state, parsed.value);
					break;
				case 'fill':
					data = await fill.handler(state, parsed.value);
					break;
				case 'type':
					data = await typeText.handler(state, parsed.value);
					break;
				case 'press':
					data = await press.handler(state, parsed.value);
					break;
				case 'hover':
					data = await hover.handler(state, parsed.value);
					break;
				case 'select':
					data = await select.handler(state, parsed.value);
					break;
				case 'check':
					data = await check.handler(state, parsed.value);
					break;
				case 'uncheck':
					data = await uncheck.handler(state, parsed.value);
					break;
				case 'get':
					data = await get.handler(state, parsed.value);
					break;
				case 'is':
					data = await is_.handler(state, parsed.value);
					break;
				case 'snapshot':
					data = await snapshot.handler(state, parsed.value);
					break;
				case 'screenshot':
					data = await screenshot.handler(state, parsed.value);
					break;
				case 'wait':
					data = await wait.handler(state, parsed.value);
					break;
				case 'scroll':
					data = await scroll.handler(state, parsed.value);
					break;
				case 'frame':
					data = await frame.handler(state, parsed.value);
					break;
				case 'tab':
					data = await tab.handler(state, parsed.value);
					break;
				case 'eval':
					data = await eval_.handler(state, parsed.value);
					break;
				case 'source':
					data = await source.handler(state, parsed.value);
					break;
				case 'resources':
					data = await resources.handler(state, parsed.value);
					break;
				case 'styles':
					data = await styles.handler(state, parsed.value);
					break;
				case 'download':
					data = await download.handler(state, parsed.value);
					break;
				case 'close':
					data = await close.handler(state);
					break;
			}

			return { ok: true, data };
		} catch (e) {
			if (e instanceof CommandError) {
				return { ok: false, error: e.message };
			}
			const message = e instanceof Error ? e.message : String(e);
			return { ok: false, error: message };
		}
	};
