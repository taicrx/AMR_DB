# AI ASP Command Center MVP

This is a static GitHub Pages dashboard designed for embedding into Google Sites.

## Data source

Use Google Sheet tabs published as CSV.

Recommended Google Sheet tabs:

1. `Fact_ASP_Monthly`
2. `Fact_Antibiogram`

## How to publish Google Sheet as CSV

Google Sheet → File → Share → Publish to web → choose sheet tab → CSV.

Paste the `Fact_ASP_Monthly` CSV URL into the dashboard input box.

For `Fact_Antibiogram`, edit `app.js`:

```js
const ANTIBIOGRAM_CSV_URL = "your-published-csv-url";
```

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `style.css`, `app.js`.
3. Go to Settings → Pages.
4. Source: Deploy from branch.
5. Branch: main / root.
6. Open the GitHub Pages URL.

## Embed in Google Sites

Google Sites → Insert → Embed → paste GitHub Pages URL.

## Privacy

Use only aggregated data. Do not upload or store patient identifiers, MRN, names, SOAP notes, or raw culture reports.
