import type { Locator, Page } from 'playwright';

// #region role sets

/** roles that represent interactive elements — always get refs */
const INTERACTIVE_ROLES = new Set([
	'button',
	'link',
	'textbox',
	'checkbox',
	'radio',
	'combobox',
	'listbox',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'searchbox',
	'slider',
	'spinbutton',
	'switch',
	'tab',
	'treeitem',
]);

/** content roles — get refs only when they have a name */
const CONTENT_ROLES = new Set([
	'heading',
	'cell',
	'gridcell',
	'columnheader',
	'rowheader',
	'listitem',
	'article',
	'region',
	'main',
	'navigation',
]);

/** structural roles — stripped in compact mode when unnamed */
const STRUCTURAL_ROLES = new Set([
	'generic',
	'group',
	'list',
	'table',
	'row',
	'rowgroup',
	'grid',
	'treegrid',
	'menu',
	'menubar',
	'toolbar',
	'tablist',
	'tree',
	'directory',
	'document',
	'application',
	'presentation',
	'none',
]);

// #endregion

// #region ref types

export interface RefEntry {
	role: string;
	name: string | undefined;
	nth: number | undefined;
}

/** mapping of ref id (e.g. "e1") to locator metadata */
export type RefMap = Record<string, RefEntry>;

// #endregion

// #region role name tracker

interface RoleNameTracker {
	getNextIndex(role: string, name: string | undefined): number;
	trackRef(role: string, name: string | undefined, ref: string): void;
	getDuplicateKeys(): Set<string>;
}

const makeKey = (role: string, name: string | undefined): string => `${role}:${name ?? ''}`;

const createRoleNameTracker = (): RoleNameTracker => {
	const counts = new Map<string, number>();
	const refsByKey = new Map<string, string[]>();

	return {
		getNextIndex(role, name) {
			const key = makeKey(role, name);
			const index = counts.get(key) ?? 0;
			counts.set(key, index + 1);
			return index;
		},

		trackRef(role, name, ref) {
			const key = makeKey(role, name);
			const existing = refsByKey.get(key);
			if (existing) {
				existing.push(ref);
			} else {
				refsByKey.set(key, [ref]);
			}
		},

		getDuplicateKeys() {
			const dupes = new Set<string>();
			for (const [key, refs] of refsByKey) {
				if (refs.length > 1) {
					dupes.add(key);
				}
			}
			return dupes;
		},
	};
};

// #endregion

// #region snapshot options

export interface SnapshotOptions {
	/** only show interactive elements */
	interactive?: boolean;
	/** strip unnamed structural roles and prune empty branches */
	compact?: boolean;
	/** text-only mode: show content and refs without role labels */
	text?: boolean;
	/** max depth of the tree */
	depth?: number;
	/** CSS selector to scope the snapshot to */
	selector?: string;
}

// #endregion

// #region aria tree line regex
// matches: `  - role "name" [attr=val]` or `  - role:` etc.
const LINE_RE = /^(\s*-\s*)(\w+)(?:\s+"([^"]*)")?(.*)$/;
// #endregion

// #region snapshot parsing

/**
 * takes a snapshot of the page's accessibility tree and assigns element refs.
 * @param page the Playwright page
 * @param options snapshot options
 * @returns object with the formatted snapshot text and the ref map
 */
export const takeSnapshot = async (
	page: Page,
	options: SnapshotOptions = {},
): Promise<{ text: string; refs: RefMap }> => {
	const locator: Locator = options.selector ? page.locator(options.selector) : page.locator('body');

	const ariaTree = await locator.ariaSnapshot();

	const refs: RefMap = {};
	let refCounter = 0;
	const tracker = createRoleNameTracker();

	const nextRef = (): string => `e${++refCounter}`;

	const lines = ariaTree.split('\n');
	const output: Array<{ text: string; depth: number; hasRef: boolean; hasContent: boolean }> = [];

	for (const line of lines) {
		const match = line.match(LINE_RE);

		if (!match) {
			// non-role lines (plain text, metadata) — keep in full mode, skip in interactive
			if (!options.interactive) {
				const depth = Math.floor((line.search(/\S/) || 0) / 2);
				output.push({ text: line, depth, hasRef: false, hasContent: line.trim().length > 0 });
			}
			continue;
		}

		const [, prefix, role, name, suffix] = match;
		const roleLower = role!.toLowerCase();
		const depth = Math.floor((prefix!.search(/\S/) === -1 ? prefix!.length : prefix!.search(/\S/)) / 2);

		// depth filtering
		if (options.depth !== undefined && depth > options.depth) {
			continue;
		}

		const isInteractive = INTERACTIVE_ROLES.has(roleLower);
		const isContent = CONTENT_ROLES.has(roleLower);
		const isStructural = STRUCTURAL_ROLES.has(roleLower);

		// interactive-only mode: skip non-interactive elements
		if (options.interactive && !isInteractive) {
			continue;
		}

		// compact/text mode: drop unnamed structural elements (pruning happens later)
		if ((options.compact || options.text) && isStructural && !name) {
			continue;
		}

		// determine if this element gets a ref
		const shouldHaveRef = isInteractive || (isContent && !!name);

		let refTag = '';
		if (shouldHaveRef) {
			const ref = nextRef();
			const nth = tracker.getNextIndex(roleLower, name);
			tracker.trackRef(roleLower, name, ref);

			refs[ref] = { role: roleLower, name, nth };
			refTag = ` [ref=${ref}]`;
		}

		// reconstruct line with ref tag
		const nthTag =
			shouldHaveRef && refs[`e${refCounter}`]?.nth ? ` [nth=${refs[`e${refCounter}`]!.nth}]` : '';
		const reconstructed = name
			? `${prefix}${role} "${name}"${refTag}${nthTag}${suffix}`
			: `${prefix}${role}${refTag}${suffix}`;

		const hasInlineContent = !!suffix && suffix.includes(':') && !suffix.endsWith(':');
		output.push({
			text: reconstructed,
			depth,
			hasRef: shouldHaveRef,
			hasContent: hasInlineContent || !!name,
		});
	}

	// post-process: remove nth from non-duplicates
	{
		const dupes = tracker.getDuplicateKeys();
		for (const [ref, entry] of Object.entries(refs)) {
			const key = makeKey(entry.role, entry.name);
			if (!dupes.has(key)) {
				entry.nth = undefined;
				// also clean up the [nth=0] from output lines
				const idx = output.findIndex((l) => l.text.includes(`[ref=${ref}]`));
				if (idx !== -1) {
					output[idx]!.text = output[idx]!.text.replace(/\s*\[nth=\d+\]/, '');
				}
			}
		}
	}

	// compact/text mode: prune branches that have no refs
	if (options.compact || options.text) {
		const pruned = compactTree(output);
		if (options.text) {
			return { text: formatTextOnly(pruned), refs };
		}
		return { text: pruned.map((l) => l.text).join('\n'), refs };
	}

	return { text: output.map((l) => l.text).join('\n'), refs };
};

/**
 * formats the tree as text-only: strips role labels, keeps names and refs,
 * drops unnamed elements, and compresses depth gaps.
 */
const formatTextOnly = (
	lines: Array<{ text: string; depth: number; hasRef: boolean; hasContent: boolean }>,
): string => {
	const ROLE_LINE_RE = /^\s*-\s*\w+(?:\s+"([^"]*)")?(.*)?$/;

	const items: Array<{ content: string; depth: number }> = [];

	for (const line of lines) {
		const match = line.text.match(ROLE_LINE_RE);
		if (match) {
			const name = match[1];
			const rest = (match[2] ?? '').trim();

			// extract ref and nth tags
			const tags = rest.match(/\[ref=\w+\](?:\s*\[nth=\d+\])?/)?.[0] ?? '';

			// skip unnamed elements with no ref
			if (!name && !tags) {
				continue;
			}

			const parts: string[] = [];
			if (name) {
				parts.push(name);
			}
			if (tags) {
				parts.push(tags);
			}
			items.push({ content: parts.join(' '), depth: line.depth });
		} else {
			// non-role line (plain text) — keep if it has content
			const trimmed = line.text.trim();
			if (trimmed) {
				items.push({ content: trimmed, depth: line.depth });
			}
		}
	}

	// compress depth gaps so there are no jumps from removed intermediate elements
	const depthStack: number[] = [-1];
	for (const item of items) {
		while (depthStack.length > 1 && depthStack[depthStack.length - 1]! >= item.depth) {
			depthStack.pop();
		}
		const compressed = depthStack.length - 1;
		depthStack.push(item.depth);
		item.depth = compressed;
	}

	return items.map((item) => `${'  '.repeat(item.depth)}${item.content}`).join('\n');
};

/**
 * prunes branches from the tree that contain no refs.
 * keeps: lines with refs, lines with inline content, and structural ancestors of ref-bearing lines.
 */
const compactTree = (
	lines: Array<{ text: string; depth: number; hasRef: boolean; hasContent: boolean }>,
): typeof lines => {
	// mark lines that should be kept: has ref, or has inline content
	const keep = Array.from({ length: lines.length }, () => false);

	for (let i = 0; i < lines.length; i++) {
		if (lines[i]!.hasRef || lines[i]!.hasContent) {
			keep[i] = true;
		}
	}

	// for each kept line, also keep all its ancestors
	for (let i = 0; i < lines.length; i++) {
		if (!keep[i]) {
			continue;
		}

		const targetDepth = lines[i]!.depth;
		// walk backwards to find ancestors at each shallower depth
		for (let j = i - 1; j >= 0 && lines[j]!.depth < targetDepth; j--) {
			if (!keep[j]) {
				keep[j] = true;
			}
		}
	}

	return lines.filter((_, i) => keep[i]);
};

// #endregion

// #region ref resolution

/**
 * parses a ref string (e.g. "@e1", "ref=e1", "e1") into the bare ref id.
 * @param input the ref string
 * @returns the bare ref id or null if not a valid ref format
 */
export const parseRef = (input: string): string | null => {
	if (input.startsWith('@')) {
		return input.slice(1);
	}
	if (input.startsWith('ref=')) {
		return input.slice(4);
	}
	if (/^e\d+$/.test(input)) {
		return input;
	}
	return null;
};

/**
 * resolves a ref or CSS selector to a Playwright locator.
 * @param page the Playwright page
 * @param selectorOrRef a ref string (e.g. "@e1") or CSS selector
 * @param refs the current ref map
 * @returns the resolved Playwright locator
 * @throws if a ref is provided but not found in the ref map
 */
export const resolveLocator = (page: Page, selectorOrRef: string, refs: RefMap): Locator => {
	const ref = parseRef(selectorOrRef);

	if (ref) {
		const entry = refs[ref];
		if (!entry) {
			throw new Error(`ref ${selectorOrRef} not found — run snapshot to refresh refs`);
		}

		let locator: Locator;
		if (entry.name) {
			locator = page.getByRole(entry.role as Parameters<Page['getByRole']>[0], {
				name: entry.name,
				exact: true,
			});
		} else {
			locator = page.getByRole(entry.role as Parameters<Page['getByRole']>[0]);
		}

		if (entry.nth !== undefined) {
			locator = locator.nth(entry.nth);
		}

		return locator;
	}

	// fall back to CSS selector
	return page.locator(selectorOrRef);
};

// #endregion
