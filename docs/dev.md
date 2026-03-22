# Development (terminal only)

**Path:** `server/docs/dev.md`

No editor-specific steps required. Use a normal terminal with **Node ≥ 20** and **npm** on your `PATH` (e.g. load nvm in `~/.zshrc`).

## First time

```bash
cd server
npm install
cp .env.example .env
```

Edit **`.env`** for your machine (port, `BASE_URL`, optional deploy metadata). Values load automatically when you run **`npm run dev`**, **`npm start`**, or **`npm run cli`**. `.env` is gitignored; keep secrets out of `.env.example`.

### Common variables

| Variable | Purpose |
| -------- | ------- |
| `PORT` | HTTP port (default `3000`). |
| `NODE_ENV` | `development` or `production`. |
| `BASE_URL` | Default server URL for `npm run cli -- scan`. |
| `ANTHROPIC_API_KEY` | Future: Anthropic API secret. |
| `ANTHROPIC_URL` / `ANTHROPIC_BASE_URL` | Future: API base URL (`ANTHROPIC_URL` wins if both set). |

Dashboard and **`GET /api/info`** show whether an Anthropic API key is present (not its value).

## Verify the project (before merge / accept)

```bash
cd server
npm run check
```

Same as:

```bash
cd server
npm run cli -- check
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | TypeScript → `dist/` |
| `npm run test` | Unit / API tests (Vitest) |
| `npm run check` | `build` then `test` |
| `npm run dev` | Run server with **nodemon** (restarts on `src/**`, `public/**`, and `.env` changes) |
| `npm start` | Run compiled server (`node dist/index.js`) |
| `npm run cli -- scan <gitUrl> [ref]` | Hit running API (needs server) |
| `npm run cli -- doctor` (or `next`) | Node / `.env` / server probe + next-step hints |

**Dashboard:** with the server running, open [http://127.0.0.1:3000/](http://127.0.0.1:3000/) — **Agent — start here** (form to queue a git job), health, job list, build history, and docs.

Deep links: [implementation tickets](http://127.0.0.1:3000/#implementation-tickets) · [agent scan form](http://127.0.0.1:3000/#agent).

**Implementation tickets:** `POST /v1/tickets` (body `{}` for default “build agent pipeline” ticket, or `{ "kind": "custom", "title", "body?" }`). In-memory until you add persistence.

**Quick create (server running):**

| Command | Effect |
|--------|--------|
| `npm run ticket` | Default pipeline ticket (same as dashboard). |
| `npm run ticket -- draft` | Custom ticket from [`docs/NEXT.md`](NEXT.md) (`Title:` + optional `Body:`). |
| `npm run cli -- ticket My title here` | Custom title (rest of line = title). |
| `npm run ticket:check` | Default ticket **then** `npm run check` (server must be up for the ticket step). |
| `npm run cursor:prompt` | Prints text to **paste into Cursor Agent** after `ticket:check` (same as `npm run cli -- prompt`). |

Tickets only **record intent** in memory; they do **not** compile code or open CI. **Cursor** does not auto-run after npm scripts — run `npm run cursor:prompt`, copy the output, open **Cursor Agent**, paste, and attach `@` files as prompted. See root `AGENTS.md`.

**Build history API:** `GET /api/build-history` (JSON), `GET /BUILD_LOG.md` (raw markdown).

**Showing a revision to people:** set any of `GIT_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `RAILWAY_GIT_COMMIT_SHA`, or `BUILD_ID` in the environment when you deploy. The dashboard and `GET /api/info` → `build` will show them.

## Shell script (install + check)

```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

## New features

Each feature should include **at least one test** that would fail if the behavior regresses (`src/**/*.test.ts`). Run `npm run test` before accepting an improvement; record results in `BUILD_LOG.md` when applicable.
