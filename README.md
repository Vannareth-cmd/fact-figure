# Cambodia in Numbers

A dashboard of Cambodia's key national indicators, built from the Fact & Figure Database. It is a static site for GitHub Pages: no server and no build step.

## What it shows

- The latest published figure for each of the 110 indicators. Each figure carries its own year, because sources publish on different schedules.
- A colour dot shows how recent each figure is: green means up to date (this year or last year), amber means 2–3 years old, red means 4 or more years old.
- A trend line, the years that have data, and the change since the previous figure.
- A detail panel for each indicator, with every year, its source and a link.
- A matrix of which years have data, so editors can see what still needs updating.
- **Download report PDF**: a report generated in the browser from the data loaded at that moment.
- **CSV**: the same table of latest figures, for use in Excel.

## Where the data comes from

The Google Sheet stays private. Only its **Data** tab is published, read-only, with Google's *Publish to web*. The page reads that CSV link each time it opens. The link is set in `index.html`:

```js
window.FF_CONFIG = {
  csvUrl: "https://docs.google.com/spreadsheets/d/e/…/pub?gid=…&single=true&output=csv",
  fallback: "data/data.json",   // copy used if the published link cannot be read
  firstYear: 2013
};
```

To get the link: in the Sheet, go to **File → Share → Publish to web**. Choose the **Data** tab and **Comma-separated values (.csv)**, turn on **Automatically republish when changes are made**, then click **Publish**.

If the link cannot be read, the page uses `data/data.json` and the status line says "Showing the built-in copy of the data".

## Updating figures (editors)

1. Open the Google Sheet and go to the **Data** tab.
2. Add one row for each new figure: Year, Code, Theme, Indicator, Value, Unit, plus the source columns (Author, Report, URL).
3. Keep Code, Theme, Indicator and Unit exactly the same as in the indicator's earlier rows.

The website picks up the change the next time someone opens or refreshes the page. Nothing needs to be published.

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page structure and data settings |
| `assets/style.css` | Design (light and dark themes) |
| `assets/app.js` | Loads the data, draws cards and charts, builds the PDF and CSV |
| `data/data.json` | Built-in copy of the data, used when the sheet cannot be read |
