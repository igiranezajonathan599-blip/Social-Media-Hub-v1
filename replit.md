# Message & Media Hub

A full-stack social communication platform where users can post, like, comment, send direct messages, and manage their profiles.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/hub run dev` — run the frontend (port 22117)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- API: Express 5 + JWT auth (jsonwebtoken + bcrypt)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (contract-first from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema (users, posts, comments, likes, conversations, messages)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT sign/verify/requireAuth
- `artifacts/hub/src/pages/` — feed, login, register, messages, profile, profile-edit
- `artifacts/hub/src/components/` — layout, post-card, UI primitives
- `artifacts/hub/src/index.css` — jewel-toned dark theme (sapphire/magenta)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod validators used in both server and client
- JWT stored in `localStorage` as `hub_token`; `custom-fetch.ts` auto-attaches Bearer header on every request and redirects to `/login` on 401
- All DB mutations flow through Drizzle ORM; raw SQL is avoided
- `lib/api-zod` barrel exports only `./generated/api` — do NOT add `./generated/types` or `./generated/api.schemas`
- Demo seed users: alex@example.com / maya@example.com / jordan@example.com — all use password `password123`

## Product

- **Feed** — create posts (text + image URL), like/unlike, comment in-thread
- **Messages** — direct message conversations with real-time-style polling (3s), search users to start new conversations
- **Profiles** — view any user's posts, bio, avatar; edit your own display name, bio, and avatar URL
- **Auth** — JWT-based register/login/logout; protected routes redirect unauthenticated users to `/login`

## User preferences

- Deep jewel-toned dark theme: sapphire background `240 70% 8%`, magenta primary `320 80% 55%`

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- API server runs on port 8080, not 5000 (replit.md had a typo)
- Do not use anonymous arrow functions with hooks in JSX render props — extract into named components
- Demo conversation IDs start at 3 (1 and 2 were test rows that were deleted)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-client-react/src/custom-fetch.ts` for auth token injection logic
