# Competitor Benchmark

SEO keyword benchmark tool powered by [DataForSEO](https://dataforseo.com). Built with Next.js 14 + TailwindCSS, deployable on Vercel.

## Features

- **Ranking Keywords** — all keywords a domain currently ranks for (organic), with full pagination
- **Relevant Keywords** — broader keyword set DataForSEO associates with the domain
- **Multi-domain Benchmark** — keyword gap analysis across up to 5 domains side by side
- Filters: position range, search volume, keyword search
- Export to CSV
- Deployable to Vercel in one click

## Setup

1. Copy `env.example` to `.env.local` and fill in your DataForSEO credentials:

```
DATAFORSEO_LOGIN=your_login@email.com
DATAFORSEO_PASSWORD=your_api_password
```

Get your credentials at [app.dataforseo.com/register](https://app.dataforseo.com/register).

2. Install dependencies:

```bash
npm install
```

3. Run locally:

```bash
npm run dev
```

## Deploy to Vercel

1. Push to your GitHub repo
2. Import in [vercel.com/new](https://vercel.com/new)
3. Add `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` as environment variables
4. Deploy

## API Endpoints used

| Endpoint | Purpose |
|---|---|
| `dataforseo_labs/google/ranked_keywords/live` | Current ranking keywords for a domain |
| `dataforseo_labs/google/keywords_for_site/live` | Relevant keyword ideas for a domain |

## Cost estimate (DataForSEO)

Each `/live` call costs ~$0.002–$0.01. A full ranked_keywords pull for a medium site (5,000 keywords) = ~20 paginated calls = a few cents.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
