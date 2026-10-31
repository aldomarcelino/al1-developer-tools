# Cron preview engine

- Dependency: `cron-parser` **5.10.2**, MIT; runtime dependency `luxon` **3.7.2**, MIT.
- Version-specific documentation: installed `node_modules/cron-parser/README.md`, declarations and implementation under `dist/`, and `LICENSE`. Upstream: https://github.com/harrisiirak/cron-parser/tree/v5.10.2.
- Browser compatibility: the package's `browser` map excludes `fs` and `fs/promises`. Only expression parsing is used; file parsing and Node I/O are not used. Next.js webpack production compilation and an actual browser Worker preview are checked during implementation. Timezone data comes from the browser's Intl implementation via Luxon.
- `cron.ts` validates a deliberately smaller grammar **before** the engine runs: exactly five numeric fields, `*`, comma lists, ascending ranges, and positive `/` steps. Names, seconds, aliases, Quartz and extensions (`?`, `L`, `W`, `#`, `H`) are rejected.
- Day matching follows the engine: `*` means unrestricted. When both day fields differ from `*`, day-of-month OR day-of-week can match. A full numeric list or `*/1` still differs from `*`. Month is always required.
- DST follows the installed engine: a skipped scheduled hour moves to the landing hour; the repeated hour runs once when searching forward. The tests pin spring and fall examples. Other cron runtimes may behave differently.
- Preview returns up to ten strictly future instants after a fixed snapshot of now, bounded by fifty calendar years. An impossible calendar can return an empty preview immediately. Engine search exhaustion returns fewer dates with an explicit limit message.
- All preview work runs in a dedicated Worker, with a 3-second deadline. Edits and unmount terminate old work; there is no synchronous UI fallback, backend, analytics, or input transmission. A worker startup failure is shown as an error.
- Builder only imports exact forms it can edit (`*`, a number, `*/n`, `a-b`). Other valid expressions stay in Expression mode, unchanged, with an explanatory snackbar. Selecting a preset intentionally replaces the expression.
