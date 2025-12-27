# AGENTS.md - AI Coding Assistant Context

> This file provides context for AI coding assistants (Cursor, Claude, Copilot, etc.) working on this project.

## Self-Updating Context

**Important**: When receiving instructions that define new standards, design patterns, architectural decisions, or conventions for this project, AI agents should:

1. Implement the requested changes
2. **Propose updates to this AGENTS.md file** to document the new patterns

This ensures future AI sessions have access to the latest project conventions. Examples of when to update this file:

- New coding conventions or style guidelines
- Architectural decisions (e.g., "always use X pattern for Y")
- New libraries or tools added to the stack
- Changes to testing strategies
- New API patterns or data access patterns
- UI/UX standards updates

When proposing AGENTS.md updates, add to the relevant section or create a new section if needed.

---

## Project Overview

**Board Game Collection Manager** - A Next.js application for managing BoardGameGeek collections with collaborative game picking features.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Database | SQLite via Prisma ORM (libSQL adapter in production) |
| Styling | Tailwind CSS v4 |
| Testing | Vitest + Testing Library |
| Real-time | Socket.IO |
| Auth | Cookie-based sessions (bcrypt) |
| Scraping | Playwright (Chromium) |

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Custom Server (server.ts)                 │
│              Next.js + Socket.IO on same port                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐         ┌───────────┐         ┌───────────┐
   │  Pages  │         │ API Routes│         │ Socket.IO │
   │ (SSR)   │         │  (REST)   │         │ (Realtime)│
   └────┬────┘         └─────┬─────┘         └─────┬─────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   lib/ Layer    │
                    │ (Business Logic)│
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │  Prisma Client  │
                    │    (SQLite)     │
                    └─────────────────┘
```

---

## Development Commands

```bash
# Development (custom server with Socket.IO)
npm run dev

# Development (Next.js only, no Socket.IO)
npm run dev:next

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage

# Linting
npm run lint
```

---

## File Structure & Naming Conventions

```
app/
├── page.tsx                    # Server Component (data fetching)
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles + Tailwind
├── api/
│   └── [resource]/
│       ├── route.ts            # API handlers (GET, POST, PATCH, DELETE)
│       └── route.test.ts       # Co-located test file
├── [feature]/
│   └── page.tsx                # Feature pages
│
components/
├── [Name].tsx                  # React component (PascalCase)
├── [Name].test.tsx             # Co-located test
│
lib/
├── [name].ts                   # Utility module (camelCase)
├── [name].test.ts              # Co-located test
├── prisma.ts                   # Singleton Prisma client
│
types/
└── [name].ts                   # TypeScript interfaces
│
prisma/
├── schema.prisma               # Database schema
└── migrations/                 # Migration history
```

### Naming Patterns

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `GameCard.tsx`, `HomeClient.tsx` |
| Client Components | `*Client.tsx` suffix | `HomeClient.tsx`, `GameDetailClient.tsx` |
| Lib modules | camelCase | `auth.ts`, `games.ts` |
| API routes | kebab-case folders | `scrape-active/route.ts` |
| Tests | `.test.ts(x)` suffix | `auth.test.ts`, `GameCard.test.tsx` |
| Types | PascalCase interfaces | `GameData`, `SyncResult` |

---

## Code Patterns

### Server/Client Component Split

Server components fetch data; client components handle interactivity:

```tsx
// app/page.tsx (Server Component)
import { getActiveGames } from "@/lib/games";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const games = await getActiveGames();
  return <HomeClient games={games} />;
}
```

```tsx
// components/HomeClient.tsx (Client Component)
"use client";

import { useState } from "react";

export function HomeClient({ games }: { games: GameData[] }) {
  const [filter, setFilter] = useState("");
  // Interactive logic here
}
```

### API Route Pattern

```tsx
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter");

  const data = await prisma.model.findMany({ where: { ... } });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.required) {
      return NextResponse.json(
        { error: "Field required" },
        { status: 400 }
      );
    }

    const result = await prisma.model.create({ data: body });
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
}
```

### Data Access Layer Pattern (lib/)

```tsx
// lib/games.ts
import prisma from "./prisma";

// Define interfaces for external use
export interface GameData {
  id: string;
  name: string;
  categories: string[];  // Parsed from JSON
}

// Helper to parse JSON stored in SQLite
function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

// Transform Prisma model to external interface
function transformGame(game: PrismaGame): GameData {
  return {
    ...game,
    categories: parseJsonArray(game.categories),
  };
}

// Export data access functions
export async function getActiveGames(): Promise<GameData[]> {
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return games.map(transformGame);
}
```

---

## Database Patterns

### Prisma Schema Conventions

```prisma
model Game {
  id          String   @id           // BGG game ID (not auto-generated)
  name        String

  // JSON arrays stored as strings (SQLite limitation)
  categories  String?                // JSON: ["Strategy", "Family"]
  mechanics   String?                // JSON: ["Dice Rolling", "Hand Management"]

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Indexes for common queries
  @@index([status])
}
```

### JSON-in-SQLite Pattern

SQLite doesn't support native arrays. Store as JSON strings and parse in TypeScript:

```tsx
// Storing
await prisma.game.update({
  where: { id },
  data: {
    categories: JSON.stringify(["Strategy", "Family"]),
  },
});

// Retrieving (in lib layer)
function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}
```

---

## Authentication & Authorization

### Session Flow

1. User logs in via `/api/auth/login`
2. Server creates session in DB, sets `session_id` cookie
3. Middleware checks cookie for protected routes
4. API routes validate session and check admin role

### Auth Utility Functions (lib/auth.ts)

```tsx
// Get current user (returns null if not logged in)
const user = await getCurrentUser();

// Require authentication (throws if not logged in)
const user = await requireAuth();

// Require admin role (throws if not admin)
const admin = await requireAdmin();
```

### Middleware Protection

```tsx
// middleware.ts
const ADMIN_PAGES = ["/settings"];
const PROTECTED_API_PREFIXES = ["/api/games", "/api/collection", "/api/settings"];

// Admin pages redirect to /login
// Protected APIs return 401 for mutating methods (POST, PATCH, DELETE)
// GET requests are public (collection viewing)
```

### First User Flow

The first registered user automatically becomes admin. Registration is then disabled; admins create additional users.

---

## Testing Conventions

### Test Structure

```tsx
// *.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies at top
vi.mock("@/lib/prisma", () => ({
  default: { model: { findMany: vi.fn() } },
}));

import prisma from "@/lib/prisma";
import { functionUnderTest } from "./module";

describe("module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Section Header (use comment blocks for organization)
  // ============================================================================

  describe("functionUnderTest", () => {
    it("should do expected behavior", async () => {
      // Arrange
      vi.mocked(prisma.model.findMany).mockResolvedValue([...]);

      // Act
      const result = await functionUnderTest();

      // Assert
      expect(result).toEqual(...);
      expect(prisma.model.findMany).toHaveBeenCalledWith(...);
    });
  });
});
```

### Component Testing

```tsx
import { render, screen, fireEvent } from "@testing-library/react";

// Mock Next.js modules
vi.mock("next/link", () => ({
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Create mock data factories
const createMockGame = (overrides = {}): GameData => ({
  id: "1",
  name: "Test Game",
  ...overrides,
});
```

### Global Mocks (vitest.setup.ts)

Prisma and Next.js navigation are mocked globally. Don't re-mock unless you need different behavior.

---

## UI & Styling Guidelines

### Color System (Dark Theme)

```css
/* Backgrounds */
bg-stone-950     /* Page background */
bg-stone-900     /* Card/section background */
bg-stone-800     /* Input/button backgrounds */

/* Text */
text-white       /* Primary text */
text-stone-400   /* Secondary text */
text-stone-500   /* Muted text */

/* Accents */
text-amber-500   /* Primary accent (links, highlights) */
bg-amber-600     /* Primary buttons */
text-emerald-400 /* Success states */
text-red-400     /* Error states */
```

### Responsive Pattern

Mobile-first with Tailwind breakpoints:

```tsx
<div className="
  p-3 sm:p-4 md:p-6      /* Padding scales up */
  text-sm sm:text-base    /* Text scales up */
  grid-cols-2 sm:grid-cols-4 md:grid-cols-6  /* Grid adjusts */
">
```

### Print Styles

Include print-optimized styles:

```tsx
<div className="
  bg-stone-900 print:bg-white
  text-white print:text-black
  print:hidden           /* Hide from print */
">
```

### Button Patterns

```tsx
// Primary action
<button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors">

// Secondary action
<button className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors">

// Danger/destructive
<button className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">

// Disabled state
<button disabled className="... disabled:opacity-50 disabled:cursor-not-allowed">
```

### Game Thumbnail Pattern

**Always use the `GameThumbnail` component** for displaying game images/thumbnails, unless the specific use case requires different behavior (e.g., small list item thumbnails where cropping is acceptable).

The `GameThumbnail` component displays images with:
- **No cropping** (`object-contain`) - preserves the natural aspect ratio
- **Blurred background** - fills the container with a saturated, blurred version of the same image
- **Consistent styling** - drop shadow, vignette overlay for depth

```tsx
import { GameThumbnail, GameThumbnailIcons } from "@/components/GameThumbnail";

// Basic usage with size preset
<GameThumbnail src={game.image} alt={game.name} size="lg" />

// Full width with custom aspect ratio
<GameThumbnail
  src={game.image}
  alt={game.name}
  size="full"
  aspectRatio="4/3"
/>

// With custom fallback icon
<GameThumbnail
  src={game.image}
  alt={game.name}
  size="md"
  fallbackIcon={GameThumbnailIcons.star}
/>

// With hover scale effect (for interactive cards)
<GameThumbnail
  src={game.image}
  alt={game.name}
  size="lg"
  hoverScale
/>
```

**Size presets:**
- `sm` (48x48px) - Small thumbnails
- `md` (64x64px) - Medium thumbnails (default)
- `lg` (96x96px) - Large thumbnails
- `xl` (128x128px) - Extra large thumbnails
- `full` - Fills container, use with `aspectRatio` prop

**When NOT to use GameThumbnail:**
- Small list items where `object-cover` cropping is acceptable (e.g., `GameListItem`)
- Gallery/picker thumbnails where uniform sizing is more important than preserving aspect ratio
- Background images or decorative uses

---

## Real-time Features (Socket.IO)

### Server Setup (server.ts)

Socket.IO runs on the same port as Next.js via custom server:

```tsx
const io = new Server(httpServer, {
  path: "/api/socketio",
  cors: { origin: dev ? ["http://localhost:3000"] : [] },
});
```

### Event Types (lib/socket-events.ts)

Shared TypeScript interfaces for client/server events:

```tsx
export interface ClientToServerEvents {
  "join-session": (data: { sessionCode: string; playerId: string }) => void;
  "player-progress": (data: { sessionCode: string; progress: number }) => void;
}

export interface ServerToClientEvents {
  "session-update": (data: SessionInfo) => void;
  "player-joined": (data: PlayerInfo) => void;
}
```

### Client Usage (lib/socket-client.ts)

```tsx
import { io, Socket } from "socket.io-client";

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  path: "/api/socketio",
});

socket.emit("join-session", { sessionCode, playerId });
socket.on("session-update", (data) => { ... });
```

---

## Don't Do (Anti-Patterns)

### Avoid These Patterns

1. **Don't use `getServerSession` or next-auth** - Use `getCurrentUser()` from `lib/auth.ts`

2. **Don't create new Prisma instances** - Import singleton from `lib/prisma.ts`
   ```tsx
   // Bad
   const prisma = new PrismaClient();

   // Good
   import prisma from "@/lib/prisma";
   ```

3. **Don't parse JSON in API routes** - Use lib layer transform functions
   ```tsx
   // Bad (in route.ts)
   const categories = JSON.parse(game.categories);

   // Good (in lib/games.ts)
   function transformGame(game) {
     return { ...game, categories: parseJsonArray(game.categories) };
   }
   ```

4. **Don't use light theme colors** - This is a dark-themed app (stone-900/950 backgrounds)

5. **Don't put business logic in API routes** - Extract to lib/ modules

6. **Don't skip the `"use client"` directive** - Required for components with hooks or browser APIs

7. **Don't use relative imports for project files** - Use `@/` alias
   ```tsx
   // Bad
   import { auth } from "../../lib/auth";

   // Good
   import { auth } from "@/lib/auth";
   ```

8. **Don't store arrays directly in Prisma** - SQLite requires JSON strings

9. **Don't hardcode port 3000** - Use `process.env.PORT || "3000"`

10. **Don't forget `dynamic = "force-dynamic"`** - Required for pages with auth/dynamic data

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite database path |
| `DATA_PATH` | `/data` | Data directory (Docker) |
| `PORT` | `3000` | Server port |
| `NEXT_PUBLIC_BASE_URL` | (auto) | Base URL for QR codes/share links |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | - | Custom Chromium path (Docker) |

---

## Docker Deployment

Multi-stage Dockerfile with:
1. **deps** - Install all dependencies, generate Prisma client
2. **builder** - Build Next.js, compile TypeScript server
3. **prod-deps** - Production dependencies only
4. **runner** - Minimal runtime with Chromium for scraping

Entrypoint runs migrations before starting:
```bash
npx prisma migrate deploy
node dist/server.js
```

---

## Common Tasks

### Adding a New API Endpoint

1. Create `app/api/[route]/route.ts`
2. Create co-located `route.test.ts`
3. Export named functions: `GET`, `POST`, `PATCH`, `DELETE`
4. Use `NextRequest`/`NextResponse`
5. Add to middleware if protected

### Adding a New Page

1. Create `app/[route]/page.tsx` (Server Component)
2. Create `components/[Feature]Client.tsx` if interactive
3. Fetch data in server component, pass to client
4. Add `export const dynamic = "force-dynamic"` if using auth

### Adding a New Database Model

1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Create lib functions in `lib/[model].ts`
4. Add transform functions for JSON fields if needed

### Writing Tests

1. Create `*.test.ts` next to source file
2. Mock Prisma/Next.js (already global in vitest.setup.ts)
3. Use `vi.mocked()` for type-safe mock returns
4. Follow describe/it structure with section comments
