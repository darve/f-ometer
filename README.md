# Fuckometer 📊

Real-time profanity trend visualization dashboard. Analyzes aggregate swear-word usage across news (GDELT) and social media (Mastodon) to surface trends, spikes, and patterns — without targeting individuals.

## Features

- **Live "Fuck Index"**: Overall profanity rate per hour/day across sources
- **Word leaderboards**: Fastest-rising swear words with spike alerts
- **Context classification**: Anger / humor / emphasis / quote (lightweight NLP)
- **Event overlays**: News events correlated with profanity spikes
- **Collocations**: Words that most commonly appear near each swear
- **Time-series visualization**: Per-word trends with spike detection
- **Heatmap**: Hour-of-day × day-of-week patterns
- **Treemap**: Share-of-total profanity breakdown

## Privacy & Safety

- ✅ **Aggregates only** — no individual users identified
- ✅ **No raw content stored** — only counts and collocations
- ✅ **Usernames stripped** — PII removed before processing
- ✅ **Slurs blocked** — excluded from example snippets

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Node.js + Hono + SQLite (better-sqlite3)
- **Frontend**: React 19 + Vite + TanStack Query + Recharts
- **Styling**: Tailwind CSS
- **Language**: TypeScript throughout

## Project Structure

```
packages/
├── shared/          # Types, lexicon, utilities
├── api/             # Hono API server + ingestion jobs
└── web/             # React dashboard
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Clone and install
cd fuckometer
pnpm install

# Build shared package first
pnpm --filter @fuckometer/shared build

# Initialize database
pnpm db:migrate

# Copy environment file
cp .env.example .env
```

### Development

```bash
# Start both API and frontend in dev mode
pnpm dev
```

Or run separately:

```bash
# Terminal 1: API server (port 3001)
pnpm --filter @fuckometer/api dev

# Terminal 2: Frontend (port 5173)
pnpm --filter @fuckometer/web dev
```

### Manual Ingestion

```bash
# Fetch from GDELT
pnpm ingest:gdelt

# Fetch from Mastodon
pnpm ingest:mastodon
```

## Configuration

Edit `.env` to customize:

```env
# Mastodon instance to poll
MASTODON_INSTANCE=https://mastodon.social

# Optional: Higher rate limits with auth
MASTODON_ACCESS_TOKEN=your_token

# Server port
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stats` | Dashboard summary statistics |
| `GET /api/timeseries/:term` | Time series for a term |
| `GET /api/heatmap/:term` | Hour×day heatmap |
| `GET /api/treemap` | Share-of-total breakdown |
| `GET /api/collocations/:term` | Co-occurring words |
| `GET /api/spikes` | Current spike alerts |
| `GET /api/events` | Recent news events |
| `GET /api/lexicon` | Available terms |

All endpoints accept `?source=gdelt|mastodon|combined` parameter.

## Data Sources

### GDELT (News)
- Global news monitoring
- Free/open API
- Hourly ingestion

### Mastodon (Social)
- Federated social media
- Public timeline polling
- Rate-limited: ~300 req/5 min
- 10-minute ingestion intervals

## Lexicon

The lexicon contains ~80 terms with:
- Variants (e.g., "f*ck", "fuk")
- Severity levels (1-3)
- Categories (general, sexual, scatological, religious)
- Slur flags (excluded from display)

## License

MIT
