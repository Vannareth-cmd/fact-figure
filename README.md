# Cambodia Fact and Figure

A dashboard of Cambodia's key national indicators, built from the Fact & Figure Database. It is a static site for GitHub Pages: no server and no build step.

## What it shows

- The latest published figure for each of the 110 indicators. Each figure carries its own year, because sources publish on different schedules.
- A colour dot shows how recent each figure is: green means up to date (this year or last year), amber means 2–3 years old, red means 4 or more years old.
- A trend line, the years that have data, and the change since the previous figure.
- A detail panel for each indicator, with every year, its source and a link.
- Sub-indicators (women/men, girls/boys, sectors, seasons, share and count) are grouped on one card with bars, and can be compared on one chart.
- **Download report PDF** and **CSV**: readers choose the indicators first (whole themes, single indicators or the headline figures). The CSV can hold the latest figure only or all years.

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

## PDF fonts

The PDF report embeds **Open Sans Light** (body text) and **Open Sans ExtraBold** (values and headings) from `assets/fonts/`. The report title and the theme names are set in **Halden Solid**. Halden is not freely licensed, so the font file is not published here. Instead, those titles are pre-rendered images in `assets/pdf-titles/`, listed in `manifest.json`. If a theme is renamed in the Sheet, that title falls back to Open Sans ExtraBold until its image is re-rendered.

## Showing or hiding an indicator (editors)

The **Indicator_List** tab has two columns that control each indicator:

| Column | Y (or blank) | N |
|---|---|---|
| `Show_on_dashboard` | Card is shown on the website | Card is hidden |
| `Include_in_downloads` | Listed in the PDF/CSV picker | Left out of all downloads |

The website reads these from the Indicator_List tab's own *Publish to web* CSV link (`listUrl` in `index.html`). If that link is not set, every indicator is shown.

## Sub-indicator groups

Groups are detected from indicator names: a name ending in " - Women", " - Men", " - Girl" or " - Boy", a name starting with "Annual", "Wet-season" or "Dry-season", or two indicators with the same name but different units. A few groups are set in `EXPLICIT` at the top of `assets/app.js`, such as population by sex, economy by sector, workforce by sector and child malnutrition. To add a sub-indicator, follow the same naming in the Sheet, for example "Adult literacy rate - Women".

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
