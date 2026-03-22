# Next ticket (draft)

Use with Cursor: **`@docs/NEXT.md`**

## Commands (server running, `BASE_URL` in `.env`)

| Command | What it does |
|--------|----------------|
| `npm run ticket` | Default **build agent pipeline** ticket (same as the big blue dashboard button). |
| `npm run ticket -- draft` | Creates a **custom** ticket using the **`Title:`** and **`Body:`** section below. |
| `npm run cli -- ticket Your title here` | Custom ticket, **title only** (no `NEXT.md`). |

The `--` after `npm run ticket` is required so npm passes `draft` to the script.

---

## Fill in, then run `npm run ticket -- draft`

Title: Your one-line ticket title goes here

Body:
Optional notes: links to files, acceptance criteria, context for whoever implements this.

---

After you file a draft ticket, you can clear or update this file for the next one.
