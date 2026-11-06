# Editing guide: Cambodia Fact and Figure dashboard

This guide is for the editor and owner. It covers two kinds of change:

- **Data**: figures, new indicators, showing or hiding an indicator. These are done **in the Google Sheet**. No code is needed.
- **Look and settings**: colours, titles, texts, CSV on or off, headline figures. These are done **in this GitHub repository**, by editing a file.

Live site: <https://khgeo.github.io/fact-figures/>

---

## 1. How to edit a file on GitHub

1. Open <https://github.com/khgeo/fact-figures> and click the file, for example `index.html`.
2. Click the **pencil** icon (*Edit this file*) at the top right of the file.
3. Make the change. To find a line quickly, press **Ctrl+F** (or **Cmd+F** on a Mac) inside the editor.
4. Click **Commit changes…**, write a short note such as "Change theme colours", and click **Commit changes**.
5. Wait 1–2 minutes. The **Actions** tab shows *pages build and deployment*. When it turns green, the site is updated.
6. Open the site and refresh it. On a Mac, press **Cmd+Shift+R**; on Windows, press **Ctrl+F5**. This makes sure you are not seeing an old copy.

If something breaks after a commit, open the file's **History**, then open the previous version and copy it back.

### Which file holds what

| File | What you change there |
|---|---|
| `index.html` | Settings (data links, **CSV on/off**), page title, big heading, intro text, footer texts |
| `assets/style.css` | **Colours**, fonts, sizes, spacing |
| `assets/app.js` | Headline figures, sub-indicator groups, short unit names, PDF title and PDF colours |
| `data/data.json` | Built-in copy of the data, used only if the Google Sheet link fails |

---

## 2. Turn CSV downloads on or off

In `index.html`, find this line (near the top, inside `window.FF_CONFIG`):

```js
allowCSV: false   /* true = readers can also download a CSV table; false = PDF report only */
```

- `false`: only the PDF report can be downloaded. The CSV button and the CSV option are hidden. **This is the current setting.**
- `true`: readers can download a CSV table as well.

Change only the word `false` or `true`, then commit.

---

## 3. Update figures for an existing indicator (Sheet)

1. Open the Google Sheet and go to the **Data** tab.
2. Add **one row per new figure**:

   | Column | What to type | Example |
   |---|---|---|
   | Year | Year of the figure | 2026 |
   | Code | Same code as the indicator's earlier rows | 5.14 |
   | Theme | Same theme text as earlier rows | 5. Agriculture |
   | Indicator | Same name as earlier rows | Annual paddy rice production |
   | Value | A plain number, without % or commas | 15.3 |
   | Unit | Same unit as earlier rows | Million tonnes |
   | Author, Report, Source_title, URL | Where the figure comes from | MAFF, Annual Conference 2026, … |
   | Published_date | Date the source was published | 2026-03-10 |
   | **Accessed_date** | **Today's date** | 2026-11-06 |

3. The website reads the Sheet each time a page opens, so the new figure appears on the next refresh. *Publish to web* republishes automatically, but this can take up to about 5 minutes.

**Accessed_date matters.** The dashboard's "Data last updated by the editor on …" line shows the latest Accessed_date in the Data tab. Fill it in on every new row.

The newest **Year** becomes the figure shown on the card. The card's colour dot follows that year automatically: green is up to date, amber is 2–3 years old, red is 4 years or older.

---

## 4. Add a new indicator (not yet in the list)

### Step 1. Choose a code

- The code is **theme number, a full stop, then a two-digit number**, for example the next free code in Health and nutrition is `9.32`.
- Always use **two digits** after the full stop: `9.05`, not `9.5`. The site reads `9.5` as `9.50`.
- Cards are ordered by code inside each theme, so pick a number where you want the card to sit.
- Format the Sheet's **Code column as Plain text** (**Format → Number → Plain text**), so that `9.10` does not turn into `9.1`.

### Step 2. Add the rows in the Data tab

Add one row for **each year** you have a figure for, with the columns from section 3. Keep these exactly the same on every row of the indicator:

- **Code**, for example `9.32`
- **Theme**, written exactly like the existing rows of that theme, for example `9. Health and nutrition`
- **Indicator**, the name shown on the card, for example `Children under 5 with birth registration`
- **Unit**, for example `Percent`

Common units: `Percent`, `Million`, `Thousand households`, `Million hectares`, `Million tonnes`, `USD`, `Billion USD`, `Per 1,000 live births`. A dash `-` means no unit.

### Step 3. Add it to the Indicator_List tab

Add a row with the new **Code** and the **Indicator** name, then set the two switches:

| Column | Y (or blank) | N |
|---|---|---|
| `Show_on_dashboard` | Card is shown on the website | Card is hidden |
| `Include_in_downloads` | Can be picked for the PDF | Left out of downloads |

If you forget this step, the indicator is still shown and downloadable. A blank or missing row counts as Y.

### Step 4. Check the site

Refresh the site. The new card appears in its theme, and it is also added to the PDF picker and the PDF report automatically.

### How the chart is chosen

You do not pick the chart; the site picks it from the data:

| If the indicator is… | The card shows |
|---|---|
| A percentage between 0 and 100 | A **ring**, with words such as "about 6 in 10" |
| Named with "growth" or "inflation" | **Columns**, one per year |
| Only two figures | **Two bars**, earlier and latest year |
| Only one figure | The number, marked "the only figure so far" |
| The same value every year | No chart, "unchanged since …" |
| Anything else | A **trend line** |

### Make it a sub-indicator of a group

Indicators are grouped on one card automatically when their names follow one of these patterns:

| Pattern | Example names | Shown as |
|---|---|---|
| Name ending in ` - Women` / ` - Men`, ` - Girl` / ` - Boy`, ` - Female` / ` - Male` or ` - Urban` / ` - Rural`, plus the same name without the ending for the total | `Adult literacy rate`, `Adult literacy rate - Women`, `Adult literacy rate - Men` | Ring gauges, one per sub-indicator |
| Name starting with `Annual`, `Wet-season` or `Dry-season` | `Annual paddy rice production`, `Wet-season paddy rice production`, `Dry-season paddy rice production` | Donut if the seasons add up to the annual total; otherwise bars |
| Same name twice, once in Percent and once as a number | `At-risk people to poor` (Percent) and `At-risk people to poor` (Million people) | One ring plus the count |

Type the space, hyphen and space exactly: ` - `.

Other groups are listed by code in `assets/app.js`, in the block `const EXPLICIT = {`:

```js
"2.02": ["Population by sex", "Male"], "2.03": ["Population by sex", "Female"],
```

Each entry is `"code": ["Group name", "Sub-indicator label"]`. To add a group, add one entry per member, with the same group name. Percentages that add up to about 100 are shown as a **donut**, for example shares by sector.

### Add a whole new theme

Use the next theme number in both Code and Theme, for example Code `10.01` and Theme `10. Climate and disasters`. The site then:

- adds a new theme tab and section by itself;
- colours it with the spare colour `--t10` (spare colours exist for themes 10, 11 and 12);
- gives it a general icon.

In the printed PDF, the theme name of a new theme is set in Open Sans ExtraBold rather than Halden Solid. Halden titles are pre-made images in `assets/pdf-titles/`, and new ones need re-rendering with the Halden font on your Mac. Ask Claude to do this when you add or rename a theme.

---

## 5. Hide an indicator

In the **Indicator_List** tab, type **N** under `Show_on_dashboard` to hide its card, or under `Include_in_downloads` to keep it out of the PDF. You don't need to delete any data.

---

## 6. Change colours

All website colours are at the top of `assets/style.css`, inside `:root { … }`. Each colour is a hex code such as `#c98300`. Use any colour picker, for example search "color picker" in Google, to get a code.

| Name | Used for |
|---|---|
| `--paper` | Page background |
| `--surface` | Card background |
| `--ink` | Main text and dark buttons |
| `--muted` | Secondary text |
| `--line` | Card borders and dividers |
| `--saffron` | "Latest" highlights (gold dot, latest year bar) |
| `--river` | Main accent (teal buttons, second series) |
| `--fresh` / `--aging` / `--stale` | Year dots: up to date, 2–3 years old, 4+ years old |
| `--t1` … `--t9` | One colour per theme: 1 Basic information, 2 Population, 3 Economic, 4 Employment, 5 Agriculture, 6 Energy and environment, 7 Education, 8 Poverty and food security, 9 Health and nutrition |
| `--t10` … `--t12` | Spare colours for new themes |

The same names appear **three times**:

1. The first `:root { … }` block is the **light** mode.
2. The next two blocks are the **dark** mode, used when the reader's device is set to dark. Use lighter versions of your colours there, and make the same change in both dark blocks.

**PDF colours** are set separately, because the PDF needs red, green and blue numbers. In `assets/app.js`, find:

```js
const THEME_RGB = { 1: [90, 107, 140], 2: [181, 72, 90], …
```

Each theme number has `[red, green, blue]`, with each number from 0 to 255. Most colour pickers show these RGB numbers next to the hex code. Keep them close to the website colours.

---

## 7. Change texts and titles

| What | File | What to search for |
|---|---|---|
| Name in the browser tab | `index.html` | `<title>Cambodia Fact and Figure</title>` |
| Name in the top bar | `index.html` | the line after `class="brand"`, which reads `Cambodia Fact and Figure` |
| Big heading on the page | `index.html` | `<h1>Cambodia <span class="k">at a Glance</span></h1>` (the part inside `<span class="k">` is the second line) |
| Intro sentence under the heading | `index.html` | `<p class="lede">` |
| "About the data" text | `index.html` | `<h3>About the data</h3>` |
| Downloads text | `assets/app.js` | `Choose the indicators you need, then download them` (when CSV is off) |
| PDF title | `assets/app.js` | `const TITLE = "Cambodia Fact and Figure";` |
| VAM line in the PDF | `assets/app.js` | `Collected, compiled and updated by VAM` |

Only change the words between the quotes or between the tags. Leave `<`, `>`, `"` and `;` as they are.

The PDF title is drawn as a Halden Solid image. If you change `TITLE`, it is set in Open Sans ExtraBold until a new Halden image is made.

---

## 8. Change the six headline figures

The hero shows six big figures. In `assets/app.js`, find:

```js
const HEADLINE = [
  ["2.01", "People"], ["3.02", "GDP per person"], ["3.03", "Economic growth"],
  ["8.01", "Below the poverty line"], ["5.14", "Paddy rice harvest"], ["9.01", "Life expectancy"]
];
```

Each entry is `["code", "short label"]`. Replace a code or a label, keeping the quotes and commas.

---

## 9. Shorter unit names

Units shown on cards can be shortened, for example `Percent` → `%` and `Tonnes/hectare` → `t/ha`. In `assets/app.js`, find `const UNIT_SHORT = {` and add a pair such as:

```js
"Thousand households": "thousand households",
```

A unit that is not in this list is shown exactly as typed in the Sheet.

---

## 10. Data links (only if the Sheet changes)

In `index.html`, inside `window.FF_CONFIG`:

- `csvUrl` is the **Publish to web** CSV link of the **Data** tab.
- `listUrl` is the same kind of link for the **Indicator_List** tab.

To get a link, open the Sheet and go to **File → Share → Publish to web**. Choose the tab, choose **Comma-separated values (.csv)**, tick **Automatically republish when changes are made**, then click **Publish** and copy the link. The Sheet itself stays private; only these tabs are readable.

`firstYear: 2013` is the first year shown on the trend lines and year bars.

---

## 11. Troubleshooting

| What you see | Why | What to do |
|---|---|---|
| A new figure doesn't show | *Publish to web* can take a few minutes, or the page is cached | Wait 5 minutes, then hard-refresh (Cmd+Shift+R or Ctrl+F5) |
| A new indicator doesn't show | Code typed with one digit (`9.5`), or `N` in `Show_on_dashboard` | Use two digits; check Indicator_List |
| A card shows the wrong year or value | A row with a later year exists, possibly a typo | Check Year and Code on all rows of that indicator |
| An indicator appears in the wrong theme | The number before the full stop in Code decides the theme | Fix the Code |
| Two indicators merged into one group | Same name, or a name ending in ` - Women` etc. | Rename one of them |
| Status says "Showing the built-in copy of the data" | The Sheet link couldn't be read | Check the Publish to web settings; `data/data.json` is used meanwhile |
| The site looks broken after editing a file | A quote, comma or bracket was removed | Restore the previous version from the file's History |
