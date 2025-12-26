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

### Fetch Collection

Fetch your game collection from BoardGameGeek:

```bash
npm run fetch
```

This scrapes your BGG collection page and fetches game images, saving the data to `data/games.json`.

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

### Refresh Collection

Fetch latest data and rebuild:

```bash
npm run refresh
```

## Printing

1. Open the site in your browser
2. Click "Print Collection" or press `Ctrl+P` / `Cmd+P`
3. The print styles will hide navigation and optimize the grid for paper

## Configuration

To use a different BGG username, edit `scripts/fetch-collection.ts`:

```typescript
const BGG_USERNAME = "your_username";
```

## Project Structure

```
├── app/
│   ├── page.tsx          # Main collection grid page
│   ├── layout.tsx         # Root layout with metadata
│   └── globals.css        # Styles including print CSS
├── components/
│   └── GameCard.tsx       # Individual game card component
├── data/
│   └── games.json         # Cached collection data
├── scripts/
│   └── fetch-collection.ts # BGG scraping script
└── types/
    └── game.ts            # TypeScript interfaces
```

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling
- [Playwright](https://playwright.dev/) - Browser automation
- [TypeScript](https://www.typescriptlang.org/) - Type safety
