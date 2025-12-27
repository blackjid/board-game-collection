# Board Game Collection Printer

A static Next.js site that displays your BoardGameGeek collection in a beautiful, print-optimized grid.

## Features

- Fetches your BGG collection using browser automation (no API key required)
- Displays game covers, titles, year, player count, and playtime
- Responsive grid layout (6 columns on desktop, 2 on mobile)
- Print-optimized CSS with proper page breaks
- Static export for easy hosting

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install Playwright browsers (first time only):

   ```bash
   npx playwright install chromium
   ```

## Usage

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view your collection.

### Build Static Site

Build the static export:

```bash
npm run build
```

The static site will be in the `out/` directory.

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
  ghcr.io/blackjid/board-game-collection:latest
```

This will:

- Start the app on port 3000
- Persist the SQLite database in a Docker volume called `bgg-data`
- Automatically run database migrations on startup

### Environment Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `DATA_PATH` | `/data` | Directory for the SQLite database |
| `DATABASE_URL` | `file:/data/games.db` | SQLite database connection string |
| `PORT` | `3000` | Port the server listens on |

### Using a Custom Data Directory

Mount a host directory instead of a Docker volume:

```bash
docker run -d \
  --name board-game-geek \
  -p 3000:3000 \
  -v /path/to/your/data:/data \
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
- [Playwright](https://playwright.dev/) - Browser automation
- [TypeScript](https://www.typescriptlang.org/) - Type safety
