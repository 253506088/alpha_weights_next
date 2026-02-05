# AlphaWeights Next

A client-side fund valuation dashboard, migrated to Next.js.

## Key Features
- **Client-Side Data Fetching**: Bypasses CORS using JSONP to fetch data directly from Eastmoney and Sina Finance.
- **LocalStorage**: All data (Fund list, Holdings, History, Config) is stored locally.
- **Starry Theme**: Premium aesthetics.
- **Responsive**: Mobile-first design.

## Installation & Dev

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run local dev server:
   ```bash
   npm run dev
   ```

3. Build for Production:
   ```bash
   npm run build
   ```

## Deployment (GitHub Pages)

This project is a static site (SPA). To deploy to GitHub Pages:

1. Update `next.config.mjs` to enable static export:
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: 'export',
     images: { unoptimized: true }
   };
   export default nextConfig;
   ```
2. Run `npm run build`.
3. The `out/` directory contains the static files. Upload these to your `gh-pages` branch.

## Usage
1. Open the page.
2. Enter a fund code (e.g. `000478`) and click Add.
3. The card updates automatically every minute (default).
4. Click a card to view intraday chart.
5. Click Settings to export/import your list.

