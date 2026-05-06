# Message & Media Hub

A full-stack social communication platform where users can post, like, comment, send direct messages (with images/video/stickers), and manage their profiles. Admins get a dashboard to manage users and posts.

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
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit); index exports only `./generated/api`
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, posts, conversations, admin)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT sign/verify/requireAuth; loads isAdmin from DB
- `artifacts/hub/src/pages/` — feed, login, register, messages, profile, profile-edit, admin
- `artifacts/hub/src/components/` — layout (admin nav link), post-card, UI primitives
- `artifacts/hub/src/data/stickers.ts` — 100 stickers in 10 categories
- `artifacts/hub/src/index.css` — jewel-toned dark theme (sapphire/magenta)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod validators
- JWT stored in `localStorage` as `hub_token`; `custom-fetch.ts` auto-attaches Bearer + redirects to `/login` on 401
- All DB mutations flow through Drizzle ORM; raw SQL avoided
- Orval zod target uses `mode: "single"` (writes to `generated/api.ts` directly, no index generation); api-client-react uses `mode: "split"`
- `lib/api-zod` barrel exports only `export * from "./generated/api"` — do NOT add other exports
- Admin routes protected by `requireAdmin` middleware; admin flag loaded from DB on every request
- Demo seed users: alex@example.com (admin) / maya@example.com / jordan@example.com — all use password `password123`

## Product

- **Feed** — create posts (text + image URL), like/unlike, comment in-thread
- **Messages** — direct messages with image/video URL sending, 100-sticker picker (10 categories), edit message (hover → pencil icon), delete message (hover → trash icon), real-time polling (3s)
- **Profiles** — view any user's posts, bio, avatar; edit own display name, bio, avatar URL
- **Auth** — JWT-based register/login/logout; protected routes redirect unauthenticated users to `/login`
- **Admin Dashboard** — stats overview (users/posts/messages/likes), user management (toggle admin/delete), post moderation (delete); only visible to admin users

## User preferences

- Deep jewel-toned dark theme: sapphire background `240 70% 8%`, magenta primary `320 80% 55%`

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- API server runs on port 8080, not 5000
- Do not use anonymous arrow functions with hooks in JSX render props — extract into named components
- Use `req.params["paramName"] as string` not `req.params.paramName` to avoid TS2345 (string | string[])
- Demo conversation IDs start at 3+ (1 and 2 were test rows that were deleted)
- alex@example.com is the admin demo user (is_admin = true in DB)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `lib/api-client-react/src/custom-fetch.ts` for auth token injection logic
