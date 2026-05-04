# Tailwind — Economic Intelligence for Small Business

A two-minute economic briefing for small business owners. Pick your sector, get three things: how your industry is performing vs. the broader market, what the recent news cycle looks like, and a plain-English AI summary that ties it all together.

---

## Screenshots

**Sector Selection**

<img width="1260" alt="Sector Selection Screen" src="https://github.com/user-attachments/assets/ec33017a-3e94-4b88-807c-88ef95f0612a" />

**Dashboard**

<img width="1268" alt="Tailwind Dashboard" src="https://github.com/user-attachments/assets/4ce9e03e-bf34-4056-b15a-da205a62c063" />

---

## What It Does

1. **Sector selection** — pick from 8 business sectors (Trades and Construction, Retail, Restaurants, Healthcare, Real Estate, Financial Services, Energy, Tech)
2. **Current Conditions** — your sector's last trading day performance vs. a calculated market benchmark, shown on a visual gauge with a Tailwind / Crosswind / Headwind direction indicator
3. **Industry News** — 3–5 recent headlines relevant to your sector, each tagged with a sentiment indicator
4. **Your Briefing** — a Claude-generated plain-English paragraph that synthesizes the data into business context

---

## APIs

| API | Purpose |
|-----|---------|
| [Yahoo Finance](https://finance.yahoo.com/) | Sector ETF performance data — no API key required |
| [Marketaux](https://marketaux.com/) | Industry news with sentiment scores |
| [Anthropic (Claude)](https://www.anthropic.com/) | Plain-English AI briefing synthesis |

All API calls are server-side. Keys never touch the browser.

**How sector performance works:** Each sector maps to a SPDR sector ETF (e.g., Tech and Software → XLK, Trades and Construction → XLI). The app fetches the last two trading day closes for all 11 sector ETFs from Yahoo Finance's chart API (no key required), calculates each sector's daily change, and derives the market benchmark as the mean across all 11. This works correctly on weekends and holidays — Yahoo only returns actual trading days, so the data is always the most recent real session. Note: this uses Yahoo Finance's unofficial chart endpoint, which has no SLA. A production version would use a licensed data source.

---

## Local Setup

**Prerequisites:** You'll need [Node.js](https://nodejs.org/) installed (version 18 or higher). If you're not sure whether you have it, open a terminal and type `node --version`. If you get a version number, you're good.

**Step 1 — Get the code**

Open a terminal and run:
```bash
git clone https://github.com/crchalfant/Tailwind
```

**Step 2 — Navigate into the project folder**
```bash
cd Tailwind
```

**Step 3 — Install dependencies**
```bash
npm install
```
This downloads everything the app needs. It may take a minute.

**Step 4 — Add your API keys**

Copy the example environment file:
```bash
cp .env.example .env.local
```
Then open `.env.local` in any text editor and fill in your two API keys (see below for where to get them).

**Step 5 — Run the app**
```bash
npm run dev
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

You need two API keys — both have free tiers:
- **Marketaux** — sign up at [marketaux.com/register](https://marketaux.com/register), then copy your API token from the dashboard
- **Anthropic** — sign up at [console.anthropic.com](https://console.anthropic.com/), add a small credit balance, and copy your API key. Claude is a paid API but costs pennies to run — a few dollars will cover hundreds of briefings for testing purposes.

Sector performance data comes from Yahoo Finance automatically — no key needed for that.

The app degrades gracefully if any key is missing — sections that can't load show a clear notice rather than breaking the whole page.

---

## How It Works

### Sector Performance — Yahoo Finance

Each of the 8 sectors maps to a SPDR sector ETF — the standard institutional proxy for S&P 500 sector performance:

| Sector | ETF | Tracks |
|--------|-----|--------|
| Trades and Construction | XLI | Industrials |
| Retail | XLY | Consumer Discretionary |
| Restaurants and Food Service | XLP | Consumer Staples |
| Healthcare and Wellness | XLV | Health Care |
| Real Estate | XLRE | Real Estate |
| Financial Services | XLF | Financials |
| Energy and Utilities | XLE | Energy |
| Tech and Software | XLK | Technology |

On each request, the server fetches 5 days of daily closes for all 11 sector ETFs from Yahoo Finance in parallel. It uses the last two real trading days to calculate each sector's daily percentage change. Weekends and holidays are handled automatically — Yahoo only includes actual trading days in the response, so there's never a 0.00% reading from a non-trading day.

The **market benchmark** is the mean of all 11 sector ETF changes for that day. The selected sector is then compared against this benchmark:

- Sector beats benchmark by **≥ 1.0%** → 🟢 **Tailwind**
- Sector trails benchmark by **≥ 1.0%** → 🔴 **Headwind**
- Within 1.0% either way → 🟡 **Crosswind**

The 1.0% threshold was chosen because daily ETF moves make a tighter band too noisy — nearly every sector would show as Tailwind or Headwind, making the neutral state meaningless.

---

### Industry News — Marketaux

Each sector has a set of keyword phrases mapped to it (e.g., Trades and Construction → `construction industry | homebuilding | contractors | building permits`). These are sent to Marketaux as a boolean OR search, sorted by publication date, filtered to the last 7 days. If fewer than 3 articles are found in 7 days, the window automatically expands to 30 days.

**Sentiment scoring:** Marketaux runs NLP analysis on each article and scores the entities mentioned (companies, sectors, topics) on a scale of -1.0 to +1.0. The app averages the entity scores across each article to produce a single article-level score, then applies thresholds:

- Score **≥ 0.15** → 🟢 **Tailwind**
- Score **≤ -0.15** → 🔴 **Headwind**
- Between -0.15 and 0.15 → 🟡 **Crosswind**

The ±0.15 band gives Crosswind a meaningful neutral range. A score of exactly 0 is common for factual reporting with no clear positive or negative lean.

Note: Marketaux's free tier returns a maximum of 3 articles per request. A paid plan would allow up to 5.

---

### Your Briefing — Claude (Anthropic)

Once sector performance and news data are fetched, both datasets are sent to Claude with a structured prompt. The prompt instructs Claude to:

- Write in plain English for a small business owner — no jargon, no financial terminology
- Describe conditions, never prescribe actions
- Reference the sector by name
- Acknowledge mixed signals honestly rather than manufacturing a clear verdict
- Keep the response to 3–5 sentences

The prompt includes the sector's daily performance vs. the market benchmark, and the headlines with their sentiment tags. Claude synthesises these into a single paragraph that reads like a briefing from a knowledgeable friend, not a data terminal.

The disclaimer — "This is not financial advice. Tailwind provides economic context, not recommendations." — is rendered as static UI below the summary, not generated by Claude. This ensures consistent formatting and keeps the boundary between information and advice explicit.

---

## Architecture

```
Browser
  └── Next.js App Router
        ├── / (Sector Selection)
        └── /dashboard (Dashboard)
              ├── /api/sector-performance  → Yahoo Finance (no key)
              ├── /api/news                → Marketaux
              └── /api/summary             → Claude
```

The three API routes are a standalone data layer. The dashboard accepts `?sector=` as a URL param to pre-select a sector on load.

**Caching:** In-memory TTL cache (60 min for sector/summary, 15 min for news). Manual refresh bypasses the cache entirely. No Redis required — right tradeoff for a demo, with a clear upgrade path.

---

## Product Decisions

**Why no financial advice:** The moment you tell a small business owner "you should hire" or "now is a good time to expand," you've crossed a regulatory line and taken on real responsibility. Tailwind describes conditions. It doesn't prescribe actions. That boundary is enforced in the Claude prompt, not just the disclaimer copy.

**Why the AI summary replaced a weighted algorithm:** An early version computed a Tailwind/Headwind verdict by weighting sector performance and news sentiment. A formula can tell you the score. It can't tell you that the main headwind is labor costs, not demand. Claude can.

**Why Yahoo Finance instead of Alpha Vantage:** Alpha Vantage's sector performance endpoint moved to a paid tier after the spec was written — it returns an empty `{}` on free accounts with no error message. FMP (the first replacement attempted) had done the same. Yahoo Finance's chart API has no key requirement, returns real SPDR ETF data, and handles weekends and holidays correctly by only including actual trading days in its response array.

**Why sector ETFs instead of index data:** SPDR sector ETFs (XLK, XLF, XLE, etc.) are the standard institutional proxy for S&P 500 sector performance. They're liquid, widely tracked, and map cleanly to the 8 sectors in the app. The full fund name is shown to the user (e.g., "Technology Select Sector SPDR Fund (XLK)") so the user knows exactly what's being measured.

**Why the sector switcher is a link, not a dropdown:** A persistent dropdown adds a custom navigation component that needs to be built, tested, and styled. A "Change sector" link that returns to Screen 1 achieves the same outcome with a fraction of the complexity.

---

## What I'd Change With More Time

- **Trend direction over time** — "Construction has been a headwind for 6 weeks and conditions are improving" is more useful than "Construction is a headwind today." A single data point tells you where things are; a trend tells you where they're going.
- **Location context** — a business owner in rural North Carolina is operating in a different market than one in Phoenix or Chicago. Right now Tailwind gives a national sector view. Adding regional economic data — local permit activity, regional employment trends, state-level spending — would make the briefing feel more relevant to the user's actual market.
- **A/B testing the Claude prompt** — the current prompt was designed and validated through reasoning, not live user data. With real users, you could run two prompt variants simultaneously and measure which produces briefings users find more useful.
- **"View more" in Industry News** — the current feed shows 3–5 headlines, which is enough for a quick scan but not enough if a story catches your eye. A "View more" button that loads an additional page of results from Marketaux would let users go deeper. The API already supports pagination — it's a UI addition, not a data problem.
- **Threshold calibration** — both the direction threshold (±1.0% vs. market benchmark) and the sentiment threshold (±0.15) were set by reasoning, not data. With real usage data, you could tune both thresholds against actual user signal.
- **Industry benchmarks** — knowing your sector has a Headwind is more useful when you know what healthy looks like. Adding typical operating margins, revenue per employee, and return metrics for each sector would let users see not just how their industry is doing macro, but whether their own numbers are in the right range.
- **Persistent cache** — swap in-memory cache for Upstash Redis for production reliability.
- **Richer news sources** — Marketaux's free tier caps at 100 requests/day. A production version would explore Finnhub or a paid Marketaux plan for higher volume and fresher data.
- **Official sector performance data** — Yahoo Finance's chart API is unofficial, has no SLA, and could break without notice. A production version would use a licensed data source — FRED industry indices, BLS sector data, or a paid financial data API.
