# Board Game Collection Manager

A Next.js application for managing your BoardGameGeek collection with collaborative game picking features.

## Features

- Syncs your BGG collection using the official XML API v2
- Displays game covers, titles, year, player count, and playtime
- Responsive grid layout (6 columns on desktop, 2 on mobile)
- Print-optimized CSS with proper page breaks
- Real-time collaborative game sessions with Socket.IO
- Multiple collection support

## Requirements

- **BGG_TOKEN**: A BoardGameGeek API token is required. Register an application at BoardGameGeek to obtain one.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your BGG_TOKEN
   ```

3. Set up the database:

   ```bash
   npx prisma migrate dev
   ```

## Usage

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your collection.

### Build

Build for production:

```bash
npm run build
npm start
```

## Running with Docker

### Pull the Image

```bash
docker pull ghcr.io/blackjid/board-game-collection:latest
```

### Run the Container

```bash
docker run -d \
  --name board-game-geek \
  -p 3000:3000 \
  -v bgg-data:/data \
  -e BGG_TOKEN=your-token-here \
  ghcr.io/blackjid/board-game-collection:latest
```

This will:

- Start the app on port 3000
- Persist the SQLite database in a Docker volume called `bgg-data`
- Automatically run database migrations on startup

### Environment Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `BGG_TOKEN` | **required** | BoardGameGeek XML API v2 bearer token |
| `DATA_PATH` | `/data` | Directory for the SQLite database |
| `DATABASE_URL` | `file:/data/games.db` | SQLite database connection string |
| `PORT` | `3000` | Port the server listens on |
| `NEXT_PUBLIC_BASE_URL` | (auto-detected) | Base URL for share links and QR codes (e.g., `https://games.example.com`). Required for collaborative sessions when testing on other devices. |
| `SESSION_EXPIRY_DAYS` | `30` | Auth session lifetime in days. Uses sliding expiration — sessions renew automatically on activity. |

### Build-time Configuration (Docker)

When building the Docker image, you can set the base URL:

```bash
docker build --build-arg NEXT_PUBLIC_BASE_URL=https://games.example.com -t my-bgg-app .
```

### Development with Custom Base URL

For local network testing (e.g., testing on your phone):

```bash
NEXT_PUBLIC_BASE_URL=http://192.168.1.100:3000 npm run dev
```

### Using a Custom Data Directory

Mount a host directory instead of a Docker volume:

```bash
docker run -d \
  --name board-game-geek \
  -p 3000:3000 \
  -v /path/to/your/data:/data \
  -e BGG_TOKEN=your-token-here \
  ghcr.io/blackjid/board-game-collection:latest
```

### View Logs

```bash
docker logs -f board-game-geek
```

### Stop and Remove

```bash
docker stop board-game-geek
docker rm board-game-geek
```

## Printing

1. Open the site in your browser
2. Click "Print Collection" or press `Ctrl+P` / `Cmd+P`
3. The print styles will hide navigation and optimize the grid for paper

## Configuration

The BGG username is configured via the Settings page in the app. Navigate to `/settings` to set your BoardGameGeek username and other options.

## Project Structure

```text
├── app/
│   ├── page.tsx          # Main collection grid page
│   ├── layout.tsx         # Root layout with metadata
│   └── globals.css        # Styles including print CSS
├── components/
│   └── GameCard.tsx       # Individual game card component
├── lib/
│   ├── bgg/              # BGG API client (XML API v2)
│   ├── games.ts          # Game data access layer
│   ├── sync.ts           # BGG collection sync logic
│   └── prisma.ts         # Database client
├── prisma/
│   └── schema.prisma     # Database schema
└── types/
    └── game.ts            # TypeScript interfaces
```

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [Prisma](https://www.prisma.io/) - Database ORM (SQLite)
- [Socket.IO](https://socket.io/) - Real-time communication
- [TypeScript](https://www.typescriptlang.org/) - Type safety
