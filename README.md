# tweetsweep

Find old posts that could harm you and delete them, with a human review step before anything is removed.

> Deleting a post does not erase it from web archives, screenshots or other people's exports.

## Status

MVP step 1 (scaffold, X login, archive import) is in place. Filters, semantic search, LLM scoring and the delete queue come next.

## Local setup

Requires Node 22+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env        # then fill it in, see below
docker compose up -d        # Postgres (pgvector) + Redis
pnpm db:migrate             # applies prisma/migrations
pnpm dev                    # http://localhost:3000
```

### Environment

| Variable | How to get it |
|---|---|
| `ENCRYPTION_KEY` | `openssl rand -base64 32` (encrypts OAuth tokens and stored tweet text) |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `X_CLIENT_ID`, `X_CLIENT_SECRET` | From your app in the [X developer portal](https://developer.x.com/) |
| `X_REDIRECT_URI` | `http://localhost:3000/api/auth/x/callback` |

### X developer app

1. Create an app and enable **OAuth 2.0** (user authentication).
2. App type: **Web App** (confidential client) gives you a client secret. A public client also works: leave `X_CLIENT_SECRET` empty.
3. Add the callback URL above exactly as written, including port.
4. Scopes requested: `tweet.read tweet.write users.read offline.access`. `offline.access` is what makes X issue a refresh token.

X API access is pay-per-use. Check current prices and rate limits in the portal before running real deletions.

## Scripts

`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm db:migrate`.
