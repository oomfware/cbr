# @oomfware/cbr

ask questions by browsing the web using Claude Code.

```sh
pnpm install -g @oomfware/cbr
```

## usage

```sh
# ask a question by browsing the web
cbr ask "What's the current top story on Hacker News?"

# specify a model (default: sonnet)
cbr ask -m opus "Find the API rate limits for the Bluesky firehose"

# start at a specific URL
cbr ask --url https://docs.python.org "How do I use match statements in Python 3.12?"

# show the browser window
cbr ask --headful "Log into my account and check my notifications"

# combine options
cbr ask --headful --url https://github.com/anthropics/claude-code -m opus "Summarize the latest release notes"
```

session data is cached at `~/.cache/cbr/sessions/`. use `cbr clean` to garbage collect orphaned
sessions:

```sh
cbr clean
```

## commands

```
cbr ask [-m opus|sonnet|haiku] [--headful] [--url <url>] <task>
cbr clean
```

| option        | description                                         |
| ------------- | --------------------------------------------------- |
| `-m, --model` | model to use: opus, sonnet, haiku (default: sonnet) |
| `--headful`   | show browser window (default: headless)             |
| `--url`       | starting URL to navigate to                         |

| command | description                                         |
| ------- | --------------------------------------------------- |
| `ask`   | ask a question by browsing the web with Claude Code |
| `clean` | garbage collect orphaned session data               |

## configuring CLAUDE.md

add this to your `~/.claude/CLAUDE.md` or project's `CLAUDE.md` to let Claude Code know about cbr:

```markdown
## cbr

If WebFetch fails (e.g. blocked by user agent, or the page relies on JS to render content), or the
answer requires looking at multiple pages, use `npx @oomfware/cbr ask <task>` instead.

- `npx @oomfware/cbr ask "What's the current top story on Hacker News?"`
- `npx @oomfware/cbr ask --url https://docs.python.org "How do I use match statements in Python 3.12?"`
- `npx @oomfware/cbr ask -m opus "Find the API rate limits for the Bluesky firehose"`
- `npx @oomfware/cbr ask --headful "Log into my account and check my notifications"`

Specific tasks with clear goals work best. Include a starting URL with `--url` when you know where
to look.

Run `npx @oomfware/cbr --help` for more options.
```
