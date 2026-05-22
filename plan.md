# J26 Interactive Screens — Implementation Plan

## Context

Greenfield project. Ingests RFID scan events from one or more Raspberry Pis (each with N scanners) and renders real-time results on display screens. Pi-side code is handled by another team — this project is the **server + admin UI + display client only**. Supports multiple concurrent "surveys" with types: `vote` (count scans per bucket) and `map` (drop group location pins). 18,000 participants, voting multiple times per day — in-memory state layer on top of the persistent event log.

---

## Monorepo Structure

```
pnpm-workspace.yaml
package.json          (root — scripts only)
.gitignore
docker-compose.yml
Dockerfile

packages/shared/      (name: "shared", private: true)
  package.json
  tsconfig.json
  src/index.ts        ← all shared types

packages/server/      (name: "server", private: true)
  package.json
  tsconfig.json
  drizzle.config.ts
  drizzle/
    0000_init.sql
  src/
    index.ts
    db/
      schema.ts
      index.ts
    auth-device.ts    ← Pi API key middleware
    auth-admin.ts     ← JWT cookie middleware (jose, no keycloak-js)
    surveys/
      types.ts
      registry.ts
      vote.ts
      map.ts
    ws/
      manager.ts
    state/
      manager.ts
    routes/
      scans.ts
      surveys.ts
      devices.ts
      ws.ts

packages/client/      (name: "client", private: true)
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  postcss.config.js
  index.html
  src/
    main.tsx
    App.tsx
    api.ts
    theme.ts          ← suncalc-based dark/light mode
    hooks/
      useSurveySocket.ts
    admin/
      AdminLayout.tsx
      SurveyList.tsx
      CreateSurveyModal.tsx
      SurveyDetail.tsx
      DeviceList.tsx
    display/
      DisplayView.tsx
      VoteDisplay.tsx
      WorldMapDisplay.tsx
      SwedenMapDisplay.tsx
```

All packages are private and never published. No npm scope needed — they reference each other via `workspace:*` in package.json. The `packages/*` glob covers all three packages.

---

## Key Dependencies

**server**: `hono`, `@hono/node-server`, `@hono/node-ws`, `drizzle-orm`, `pg`, `csv-parse`, `jose`, `dotenv`, `shared`  
**server dev**: `drizzle-kit`, `typescript`, `@types/node`, `@types/pg`, `tsx`

**client**: `react`, `react-dom`, `@tanstack/react-router`, `d3-geo`, `topojson-client`, `world-atlas`, `suncalc`, `shared`  
**client dev**: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/topojson-client`, `@types/d3-geo`, `@types/suncalc`

---

## Shared Types (`packages/shared/src/index.ts`)

```typescript
type SurveyType = 'vote' | 'map'
type SurveyStatus = 'active' | 'ended' | 'draft'

// Vote config: scannerIds determine which bucket a scan goes into
interface VoteBucket { label: string; scannerIds: string[] }
interface VoteSurveyConfig { buckets: VoteBucket[] }

// Map config
interface MapSurveyConfig { pinLifetimeSeconds: number; rescanCooldownSeconds: number }

type SurveyConfig = VoteSurveyConfig | MapSurveyConfig

// Display state (sent over WS)
interface VoteDisplayState { type: 'vote'; buckets: { label: string; count: number }[]; totalVotes: number }
interface Pin {
  tagId: string
  displayName: string   // group name; for Swedish groups: town; for international: country
  lat: number
  lng: number
  scannedAt: string
  expiresAt: string
}
interface MapDisplayState { type: 'map'; pins: Pin[] }
type DisplayState = VoteDisplayState | MapDisplayState

// WebSocket messages
type ClientWsMessage = { type: 'subscribe'; surveyId: string }
type ServerWsMessage =
  | { type: 'state';        surveyId: string; data: DisplayState }
  | { type: 'update';       surveyId: string; data: DisplayState }
  | { type: 'survey_ended'; surveyId: string; data: null }

// REST
interface SurveyResponse { id: string; name: string; type: SurveyType; config: SurveyConfig; status: SurveyStatus; createdAt: string; endsAt: string | null; displayState: DisplayState | null }
interface CreateDeviceResponse { id: string; name: string; key: string }  // raw key shown once
type ScanIngestionRequest = { surveyId: string; scannerId: string; tagId: string }[]  // always an array
```

---

## Database Schema (`server/src/db/schema.ts`)

```typescript
devices:     id (uuid), name (text), key_hash (text unique), created_at
surveys:     id (uuid), name, type, config (jsonb), status, created_at, ends_at (nullable)
scan_events: id (uuid), survey_id (fk), scanner_id, tag_id, scanned_at, accepted (bool), rejection_reason (nullable)
tag_mappings: id (uuid), tag_id (text unique), display_name, lat (numeric), lng (numeric)
```

`tag_mappings` is global — not scoped to a survey. Each row maps a tag serial to a display name and coordinates. Multiple tag serials can point to the same group (same lat/lng, same display_name) since multiple participants carry different tags for the same group. For Swedish groups the display name is a town; for international groups a country. Populated once via CSV upload; shared across all surveys.

Initial migration (`drizzle/0000_init.sql`):
```sql
CREATE INDEX ON scan_events (survey_id, accepted);
CREATE INDEX ON scan_events (survey_id, tag_id, scanned_at);
CREATE INDEX ON scan_events (survey_id, scanned_at);
```

`drizzle-orm/postgres-js` `migrate()` runs on server startup.

---

## Authentication

### Pi → Server (`auth-device.ts`)
`Authorization: Bearer <raw-key>` on `POST /api/scans`.  
SHA-256 hash the token, look up in `devices.key_hash`. 401 if not found.  
Key generation: `crypto.randomBytes(32).toString('hex')`, store hash, return raw key once.

### Admin UI → Server (`auth-admin.ts`)
JWT is already in the cookie `j26-auth_access-token`, set by the Keycloak-aware portal on the same domain. No keycloak-js. Server reads the cookie and validates with `jose`:

```typescript
// Discover JWKS URL from OIDC config at startup
const JWKS = createRemoteJWKSet(new URL(JWKS_URI))  // from .well-known/openid-configuration

// Middleware: read cookie 'j26-auth_access-token', jwtVerify(token, JWKS)
// Extract roles from token claims
// 401 on missing/invalid token
// 403 if required role not present
```

Two roles in JWT claims:
- **read** — can view surveys, devices, display states
- **write** — can create/modify/delete surveys and devices

WRITE routes: `POST/PATCH/DELETE /api/surveys`, `POST /api/tags`, `POST/DELETE /api/devices`  
READ routes: `GET /api/surveys`, `GET /api/devices`  
**Unprotected**: `POST /api/scans`, `/ws`

Env vars: `OIDC_CONFIG_URL` (the `.well-known` URL), `AUTH_COOKIE_NAME=j26-auth_access-token`.  
If the admin client gets a 401, it redirects to the Keycloak login URL (derived from the OIDC config `authorization_endpoint`).

---

## In-Memory State Architecture

**Why**: Recomputing vote counts or active map pins from DB on every scan is slow at scale. Memory is live truth; DB is durable log.

### SurveyHandler interface (`surveys/types.ts`)

```typescript
interface SurveyHandler<TConfig, TState> {
  buildState(survey: DbSurvey, events: DbScanEvent[], tagMappings: DbTagMapping[]): TState
  handleScan(state: TState, scan: { scannerId: string; tagId: string }, config: TConfig): ScanResult<TState>
  toDisplayState(state: TState, config: TConfig): DisplayState
  cleanupExpired(state: TState, config: TConfig): { changed: boolean; newState: TState }
}

type ScanResult<TState> = { accepted: boolean; rejectionReason?: string; newState: TState }
```

`handleScan` is **synchronous** — Node.js single-thread guarantees atomic check-then-update. DB write happens after. `cleanupExpired` is non-optional; handlers that don't need it return `{ changed: false, newState: state }`.

### VoteMemState

```typescript
{ votedTags: Set<string>; bucketCounts: Map<string, number> }
```

Rate limit: one vote per tag per survey (permanent). `votedTags.has(tagId)` → reject `'already_voted'`.  
If scannerId not in any bucket's `scannerIds` → reject `'scanner_not_in_bucket'`. This serves as implicit scanner validation for vote surveys: a scanner that isn't configured in a bucket simply doesn't belong to this survey. No separate scanner allowlist needed.

### MapMemState

```typescript
{
  activePins: Map<string, Pin>          // tagId → pin
  lastScanTime: Map<string, Date>       // tagId → last accepted scan time
  tagMappings: Map<string, DbTagMapping>  // pre-loaded; refreshed after CSV upload
}
```

Map surveys trust any scanner that POSTs with the correct `surveyId` — no scanner allowlist. The device API key is sufficient authentication; if a Pi knows the surveyId it's authorised to post to it. Rate limit is per **tag serial number** (`tagId`), not per group. Two members of the same group holding different tags can each check in back-to-back — both accepted, both get their own pin at the same coordinates. The same tag scanning again within the cooldown window is rejected. Default `rescanCooldownSeconds: 300` (5 minutes).

Pin expiry is a **frontend rendering concern** — the client fades pins based on `expiresAt`. The backend does not broadcast tick updates. `cleanupExpired()` is called periodically for memory hygiene and to exclude expired pins from the initial `state` message sent to new WS subscribers.

### StateManager (`state/manager.ts`)

One instance created at startup in `index.ts`, injected into routes and WsManager.

Key methods:
- `initialize()` — load active surveys from DB, rebuild states, schedule cleanup timers
- `processScan({ surveyId, scannerId, tagId })` — look up survey by id, call its handler, write DB, broadcast. Returns 404 if survey not active.
- `activateSurvey(survey)` — build initial state, add to map, schedule timers
- `endSurvey(surveyId)` — update DB, broadcast `survey_ended`, clear timers, remove from map
- `refreshTagMappings()` — re-query global `tag_mappings`, update `tagMappings` in all active map survey states
- `getDisplayState(surveyId)` — returns current display state (filtered for expired pins) for WS initial sync

**Timer logic**:
- Map surveys: `setInterval` every 60s → call `cleanupExpired()`, remove stale entries from memory only (no broadcast)
- Vote surveys with `ends_at`: `setTimeout` → call `endSurvey()`. Rescheduled on `initialize()` for any future `ends_at`.

### WsManager (`ws/manager.ts`)

```typescript
connToSurveys: Map<WSContext, Set<string>>
surveyToConns: Map<string, Set<WSContext>>

subscribe(ws, surveyId)
disconnect(ws)            // cleans both maps
broadcast(surveyId, msg)  // per-connection try/catch; disconnect dead sockets
```

---

## REST Routes

| Method | Path | Role | Notes |
|--------|------|------|-------|
| POST | `/api/scans` | device key | always an array; `processScan` for each item |
| GET | `/api/surveys` | read | returns surveys + current display state |
| POST | `/api/surveys` | write | creates + activates if status=active |
| GET | `/api/surveys/:id` | read | |
| PATCH | `/api/surveys/:id` | write | handle status changes, reschedule ends_at |
| DELETE | `/api/surveys/:id` | write | |
| POST | `/api/tags` | write | multipart CSV; upsert on `tag_id` conflict; call `refreshTagMappings()` |
| GET | `/api/devices` | read | |
| POST | `/api/devices` | write | generate key, return raw key once |
| DELETE | `/api/devices/:id` | write | |
| GET | `/ws` | — | WebSocket upgrade |

### WebSocket (`routes/ws.ts`)

On `subscribe`: call `wsManager.subscribe`, get display state (with expired pins filtered), send `state` message.  
On close/error: `wsManager.disconnect`.

---

## Tag CSV Format

Global, not per-survey. Columns: `tag_id, display_name, lat, lng`.  
`display_name` encodes the appropriate label — town for Swedish groups, country for international. Upsert on `tag_id` conflict. After upsert, call `refreshTagMappings()` to push updated mappings into all active map survey states.

~400 groups, potentially many tags per group. Uploaded once; valid for all surveys.

---

## Client Routing

Uses TanStack Router (file-based or code-based routing).

```
/                          → redirect /admin
/admin                     → SurveyList
/admin/surveys/new         → CreateSurveyModal
/admin/surveys/:id         → SurveyDetail
/admin/devices             → DeviceList
/display/$surveyId         → DisplayView (public, no auth)
```

No keycloak-js. All admin routes check auth state from a lightweight context (does `j26-auth_access-token` cookie exist + is the admin API responding without 401). On 401, redirect to Keycloak `authorization_endpoint`.

### `useSurveySocket(surveyId)` hook
- Derives WS URL from `window.location`
- Sends `subscribe` on open; handles `state`, `update`, `survey_ended`
- Exponential backoff reconnect (cap 30s)

### VoteDisplay
Horizontal bars per bucket, percentage of total, CSS transition on width change.

### Map Displays (`WorldMapDisplay.tsx`, `SwedenMapDisplay.tsx`)
Custom SVG maps, no tile server. Uses:
- `d3-geo` for projections (`geoEqualEarth` for world, `geoMercator` with Sweden bounds for Sweden view)
- `world-atlas` + `topojson-client` for country/land outlines
- Pins as SVG `<circle>` elements, no image assets
- Opacity computed client-side: `(expiresAt - now) / pinLifetimeSeconds`, floored at 0
- `useEffect` with a `setInterval` (10s) to update pin opacity as time passes
- Tooltip on hover: `displayName`

`DisplayView` determines which map to show based on survey config or a URL param (e.g. `?view=sweden`).

### Dark/Light Mode (`theme.ts`)
Uses `suncalc` with the event site coordinates (hard-coded for Jamboree 2026 venue).  
On mount and on a daily timer: compute `sunrise`/`sunset` for today → set `dark` class on `<html>` if current time is outside [sunrise, sunset].  
Tailwind dark mode uses `class` strategy.

---

## Data Flow

```
Pi → POST /api/scans (Bearer device key) — body: [{ surveyId, scannerId, tagId }]
      │
      ▼
  auth-device.ts (SHA-256 hash lookup)
      │
      ▼
  StateManager.processScan({ surveyId, scannerId, tagId })
    ├── look up active survey by surveyId → 404 if not found/not active
    ├── VoteHandler.handleScan()  ← sync, atomic
    │     └── bucket lookup (scannerId) → Set check (votedTags) → accept/reject
    ├── MapHandler.handleScan()
    │     └── cooldown check (lastScanTime) → accept/reject
    ├── db INSERT scan_events (accepted/rejected)
    └── WsManager.broadcast() → display clients receive 'update'

Display client → WS connect → {type:'subscribe', surveyId}
      │
      ▼
  WsManager.subscribe()
  StateManager.getDisplayState() → {type:'state', data} (expired pins excluded)
      │
  Future scans → broadcast {type:'update', data}
  Pin fading handled entirely in client (opacity from expiresAt)
```

---

## Production Build

Node 24 native type stripping is used — no TypeScript compilation step for the server. pnpm workspace symlinks resolve to real paths outside `node_modules`, so type stripping applies to `shared` as well. Do not use `pnpm deploy` (it copies packages into a real `node_modules` directory, breaking this).

Multi-stage Dockerfile:
1. Build stage: install pnpm, install deps, build client (Vite) only
2. Production stage: server source + client dist + drizzle migrations + prod deps

Server dev script: `tsx watch src/index.ts`

Client dist served by Hono `serveStatic` in production. `docker-compose.yml`: `postgres:16-alpine` + `app`.

---

## Build Order

1. Root config (`pnpm-workspace.yaml`, `package.json`, `.gitignore`)
2. `packages/shared/src/index.ts`
3. `packages/server/` config + `drizzle/0000_init.sql` + `packages/server/src/db/`
4. `packages/server/src/auth-device.ts`, `packages/server/src/auth-admin.ts`
5. `packages/server/src/surveys/types.ts` → `vote.ts` → `map.ts` → `registry.ts`
6. `packages/server/src/ws/manager.ts`
7. `packages/server/src/state/manager.ts`
8. `packages/server/src/routes/` (scans, surveys, devices, ws)
9. `packages/server/src/index.ts`
10. `packages/client/` config files + `theme.ts`
11. `packages/client/src/api.ts`, `hooks/useSurveySocket.ts`
12. `packages/client/src/admin/` components
13. `packages/client/src/display/` components (`WorldMapDisplay`, `SwedenMapDisplay`, `VoteDisplay`, `DisplayView`)
14. `packages/client/src/App.tsx`, `main.tsx`
15. `Dockerfile`, `docker-compose.yml`

---

## Verification

1. `pnpm --filter shared tsc --noEmit`
2. `pnpm --filter server tsc --noEmit`
3. Start postgres + server → `\dt` shows 4 tables
4. `POST /api/devices` → save key
5. `POST /api/surveys` (vote config) → `POST /api/scans` → WS receives `update`
6. Same tag again → `accepted=false` in DB, no WS broadcast
7. `POST /api/surveys` (map config) → upload tag CSV → scan tagged RFID → pin appears in WS state
8. Wait past `rescanCooldownSeconds` → same tag accepted again
9. New WS subscriber after pins have aged → expired pins excluded from initial `state`
10. Restart server → reconnect WS → verify state rebuilt from DB
11. `docker-compose up --build` → admin UI loads, 401 redirects to Keycloak login
