/* Cambodia Fact and Figure — reads the published Data tab of the Google Sheet, falls back to data/data.json. */
(function () {
  "use strict";
  const CFG = Object.assign({ csvUrl: "", listUrl: "", fallback: "data/data.json", firstYear: 2013 }, window.FF_CONFIG || {});
  const NOW = new Date().getFullYear();
  const TITLE = "Cambodia Fact and Figure";

  const ICONS = {
    1: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/></svg>',
    2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 14c2.8 0 5 2.2 5 5"/></svg>',
    3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M6 16v-4M11 16V8M16 16v-6M20 16V5"/></svg>',
    4: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
    5: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9"/><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 9c0-3 2-5 5-5 0 3-2 5-5 5zM12 17c2.5 0 4.5-1.8 4.5-4.5-2.5 0-4.5 1.8-4.5 4.5z"/></svg>',
    6: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19 13 11"/></svg>',
    7: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/></svg>',
    8: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/></svg>',
    9: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 6.6a5 5 0 0 0-8.8-2.3 5 5 0 0 0-8.8 2.3C2.5 11 12 20 12 20s9.5-9 8.8-13.4z"/><path d="M7 11h3l1.5-2.5 2 5L15 11h2"/></svg>'
  };
  const THEME_RGB = { 1: [90, 107, 140], 2: [181, 72, 90], 3: [201, 131, 0], 4: [122, 90, 166], 5: [76, 140, 63], 6: [47, 143, 134], 7: [47, 111, 179], 8: [176, 96, 46], 9: [194, 65, 111] };
  const HEADLINE = [
    ["2.01", "People"], ["3.02", "GDP per person"], ["3.03", "Economic growth"],
    ["8.01", "Below the poverty line"], ["5.14", "Paddy rice harvest"], ["9.01", "Life expectancy"]
  ];
  const UNIT_SHORT = { "Males per 100 females": "males per 100 females", "Percent": "%", "Percent of GDP": "% of GDP", "-": "", "Million": "million", "Billion USD": "billion USD", "Tonnes/hectare": "t/ha", "Million tonnes": "million t", "Million hectares": "million ha", "Population per Sq.km": "people/km²" };

  /* Sub-indicator groups. Explicit groups first; then automatic rules (" - Women", "Wet-season …", same name with another unit). */
  const EXPLICIT = {
    "2.02": ["Population by sex", "Male"], "2.03": ["Population by sex", "Female"],
    "3.04": ["Economy by sector", "Agriculture"], "3.05": ["Economy by sector", "Industry"], "3.06": ["Economy by sector", "Services"],
    "4.03": ["Workforce by sector", "Agriculture"], "4.04": ["Workforce by sector", "Industry"], "4.05": ["Workforce by sector", "Services"],
    "9.12": ["Under-5 child malnutrition", "Underweight"], "9.13": ["Under-5 child malnutrition", "Stunting"], "9.14": ["Under-5 child malnutrition", "Wasting"]
  };
  const SUFFIX = /^(.*?)\s+-\s+(Women|Men|Girl|Girls|Boy|Boys|Female|Male|Urban|Rural)$/i;
  const SEASON = /^(Annual|Wet-season|Dry-season)\s+(.+)$/i;
  const SEASON_LABEL = { "annual": "Whole year", "wet-season": "Wet season", "dry-season": "Dry season" };
  const SUB_ORDER = ["Whole year", "Wet season", "Dry season", "All", "Women", "Men", "Girls", "Boys", "Female", "Male"];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const unitShort = (u) => (u in UNIT_SHORT ? UNIT_SHORT[u] : u || "");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function fmt(v) {
    if (v == null || isNaN(v)) return "–";
    const a = Math.abs(v);
    const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : 3;
    return Number(v).toLocaleString("en-US", { maximumFractionDigits: d });
  }
  function fresh(y) { const age = NOW - y; return age <= 1 ? "fresh" : age <= 3 ? "aging" : "stale"; }
  const FRESH_LABEL = { fresh: "Up to date", aging: "2–3 years old", stale: "4+ years old" };
  const seriesColor = (tn, k) => [`var(--t${tn})`, "var(--river)", "var(--saffron)", "var(--t4)", "var(--t9)"][k % 5];

  let ROWS = [], IND = [], BY = {}, THEMES = [], YEARS = [], SOURCE = "", ACTIVE = 0, QUERY = "";
  const SELECTED = new Set();

  /* ---------- data ---------- */
  function normCode(c) {
    if (typeof c === "number") return c.toFixed(2);
    c = String(c || "").trim();
    return /^\d+\.\d$/.test(c) ? c + "0" : c;
  }
  function clean(rows) {
    return rows.map((r) => ({
      Year: Number(r.Year), Code: normCode(r.Code), Theme: String(r.Theme || "").trim(),
      Indicator: String(r.Indicator || "").replace(/[​-‍﻿]/g, "").trim(),
      Value: typeof r.Value === "number" ? r.Value : parseFloat(String(r.Value).replace(/,/g, "")),
      Unit: r.Unit || "", Remark: r.Remark || "", Author: r.Author || "", Report: r.Report || "",
      Source_title: r.Source_title || "", URL: r.URL || "", Published_date: r.Published_date || "", Accessed_date: r.Accessed_date || "", Notes: r.Notes || ""
    })).filter((r) => r.Code && r.Year > 1900 && isFinite(r.Value));
  }
  /* Live data: the "Publish to web" CSV of the Data tab. Only that tab is public; the Sheet stays private. */
  async function loadLive() {
    if (!CFG.csvUrl || !window.Papa) throw new Error("no published link");
    const sep = CFG.csvUrl.includes("?") ? "&" : "?";
    const res = await fetch(CFG.csvUrl + sep + "_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("http " + res.status);
    const parsed = Papa.parse(await res.text(), { header: true, dynamicTyping: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    const rows = clean(parsed.data);
    if (rows.length < 50) throw new Error("too few rows");
    return rows;
  }
  /* Editor switches from the Indicator_List tab: Show_on_dashboard and Include_in_downloads (Y/N, blank = Y). */
  async function loadVisibility() {
    if (!CFG.listUrl || !window.Papa) return {};
    const sep = CFG.listUrl.includes("?") ? "&" : "?";
    const res = await fetch(CFG.listUrl + sep + "_=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("http " + res.status);
    const rows = Papa.parse(await res.text(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_") }).data;
    const no = (v) => /^(n|no|false|0|hide|hidden)$/i.test(String(v == null ? "" : v).trim());
    const out = {};
    rows.forEach((r) => { const c = normCode(r.code); if (c) out[c] = { dash: !no(r.show_on_dashboard), dl: !no(r.include_in_downloads) }; });
    return out;
  }
  let VIS = {};
  async function loadFallback() {
    const res = await fetch(CFG.fallback, { cache: "no-store" });
    return clean(await res.json());
  }

  function groupInfo(i, names) {
    if (EXPLICIT[i.code]) return { g: EXPLICIT[i.code][0], label: EXPLICIT[i.code][1] };
    let m = SUFFIX.exec(i.name);
    if (m) return { g: m[1], label: cap(m[2].toLowerCase()).replace(/^Girl$/, "Girls").replace(/^Boy$/, "Boys") };
    if (names.some((n) => SUFFIX.test(n) && SUFFIX.exec(n)[1] === i.name)) return { g: i.name, label: "All" };
    m = SEASON.exec(i.name);
    if (m) return { g: cap(m[2]), label: SEASON_LABEL[m[1].toLowerCase()] };
    return { g: i.name, label: "" };
  }
  function build(rows) {
    ROWS = rows; BY = {};
    rows.forEach((r) => { (BY[r.Code] = BY[r.Code] || []).push(r); });
    IND = Object.keys(BY).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b)).map((code) => {
      const s = BY[code].slice().sort((a, b) => a.Year - b.Year);
      const last = s[s.length - 1], prev = s.length > 1 ? s[s.length - 2] : null;
      const v = VIS[code] || { dash: true, dl: true };
      return { code, tn: parseInt(code, 10), theme: last.Theme.replace(/^\d+\.\s*/, ""), name: last.Indicator, unit: last.Unit, series: s, last, prev, dash: v.dash, dl: v.dl };
    });
    const maxY = Math.max(NOW, ...rows.map((r) => r.Year));
    const minY = Math.min(CFG.firstYear, ...rows.map((r) => r.Year));
    YEARS = []; for (let y = minY; y <= maxY; y++) YEARS.push(y);

    const tmap = {};
    IND.forEach((i) => { (tmap[i.tn] = tmap[i.tn] || { n: i.tn, name: i.theme, inds: [] }).inds.push(i); });
    THEMES = Object.values(tmap).sort((a, b) => a.n - b.n);
    THEMES.forEach((t) => {
      const names = t.inds.map((i) => i.name);
      const gmap = new Map();
      t.inds.forEach((i) => {
        const gi = groupInfo(i, names);
        const key = gi.g.toLowerCase();
        if (!gmap.has(key)) gmap.set(key, { name: gi.g, members: [] });
        gmap.get(key).members.push({ ind: i, label: gi.label });
      });
      t.entries = [];
      gmap.forEach((g) => {
        if (g.members.length === 1) { t.entries.push({ type: "one", ind: g.members[0].ind }); return; }
        const units = new Set(g.members.map((m) => m.ind.unit));
        g.members.forEach((m) => { if (!m.label) m.label = units.size > 1 ? (m.ind.unit === "Percent" ? "Share" : "Number") : m.ind.name; });
        g.members.sort((a, b) => { const x = SUB_ORDER.indexOf(a.label), y = SUB_ORDER.indexOf(b.label); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y) || parseFloat(a.ind.code) - parseFloat(b.ind.code); });
        g.members.forEach((m) => { m.ind.group = g; m.ind.sub = m.label; });
        g.sameUnit = units.size === 1; g.tn = t.n; g.id = "g" + g.members[0].ind.code.replace(".", "-");
        t.entries.push({ type: "group", group: g });
      });
    });
  }

  /* ---------- small graphics ---------- */
  function spark(ind, w, h, color) {
    const s = ind.series; if (!s.length) return "";
    const y0 = YEARS[0], y1 = YEARS[YEARS.length - 1];
    const vs = s.map((r) => r.Value); let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi === lo) { hi += 1; lo -= 1; }
    const px = (y) => 3 + ((y - y0) / (y1 - y0)) * (w - 6);
    const py = (v) => h - 4 - ((v - lo) / (hi - lo)) * (h - 9);
    const pts = s.map((r) => [px(r.Year), py(r.Value)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
    const area = line + `L${pts[pts.length - 1][0].toFixed(1)} ${h}L${pts[0][0].toFixed(1)} ${h}Z`;
    const e = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${area}" fill="${color}" fill-opacity=".14"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="3" fill="var(--saffron)" stroke="var(--surface)" stroke-width="1.5"/></svg>`;
  }
  function strip(ind) {
    const have = new Set(ind.series.map((r) => r.Year));
    return `<div class="strip" style="--yrs:${YEARS.length}" title="Years with data, ${YEARS[0]}–${YEARS[YEARS.length - 1]}">` +
      YEARS.map((y) => `<span class="${y === ind.last.Year ? "last" : have.has(y) ? "on" : ""}"></span>`).join("") + "</div>";
  }
  function deltaText(ind, short) {
    if (!ind.prev) return "";
    const d = ind.last.Value - ind.prev.Value;
    const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "■";
    return `<span class="delta">${arrow} ${fmt(Math.abs(d))}${short ? "" : " since " + ind.prev.Year}</span>`;
  }
  const yrChip = (y) => `<span class="yr ${fresh(y)}" title="${FRESH_LABEL[fresh(y)]}">${y}</span>`;

  /* ---------- render ---------- */
  /* Latest date an editor entered a figure: the most recent Accessed_date in the Data tab. */
  function lastUpdated() {
    let best = null;
    ROWS.forEach((r) => {
      if (!r.Accessed_date) return;
      const s = String(r.Accessed_date).trim();
      const m = /^Date\((\d+),(\d+),(\d+)\)$/.exec(s);
      const d = m ? new Date(+m[1], +m[2], +m[3]) : new Date(s);
      if (!isNaN(d) && d.getFullYear() > 2000 && (!best || d > best)) best = d;
    });
    return best;
  }
  function renderStatus() {
    const d = lastUpdated();
    const txt = d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "–";
    const el = $("#status");
    el.className = "status live";
    el.innerHTML = `<i></i>Data last updated by the editor on ${txt}`;
    $("#updated").textContent = txt;
    $("#n-ind").textContent = IND.filter((i) => i.dash).length;
  }
  function renderHeadline() {
    $("#headline").innerHTML = HEADLINE.map(([code, label]) => {
      const i = IND.find((x) => x.code === code); if (!i || !i.dash) return "";
      return `<button class="hl" data-code="${code}" style="--tc:var(--t${i.tn})"><span class="lbl">${esc(label)}</span>
        <span class="val num">${fmt(i.last.Value)}<small>${esc(unitShort(i.unit))}</small></span>
        <span class="foot">${yrChip(i.last.Year)}${spark(i, 92, 28, `var(--t${i.tn})`)}</span></button>`;
    }).join("");
  }
  function renderChips() {
    const all = `<button class="chip" data-t="0" aria-pressed="${ACTIVE === 0}" style="--tc:var(--river)"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg></span>All themes <span class="n">${IND.filter((i) => i.dash).length}</span></button>`;
    $("#chips").innerHTML = all + THEMES.filter((t) => t.inds.some((i) => i.dash)).map((t) =>
      `<button class="chip" data-t="${t.n}" aria-pressed="${ACTIVE === t.n}" style="--tc:var(--t${t.n})"><span class="ic">${ICONS[t.n] || ""}</span>${esc(t.name)} <span class="n">${t.inds.filter((i) => i.dash).length}</span></button>`).join("");
  }
  function card(i) {
    return `<button class="card" data-code="${i.code}" style="--tc:var(--t${i.tn})">
      <span class="top"><span class="name">${esc(i.name)}</span><span class="code">${i.code}</span></span>
      <span class="mid"><span class="val num">${fmt(i.last.Value)}<small${unitShort(i.unit).length > 10 ? ' class="long"' : ""}>${esc(unitShort(i.unit))}</small></span>${spark(i, 104, 34, `var(--t${i.tn})`)}</span>
      ${strip(i)}
      <span class="bot">${yrChip(i.last.Year)}${deltaText(i)}</span></button>`;
  }
  function groupCard(g, members) {
    const codes = members.map((m) => m.ind.code).sort((a, b) => parseFloat(a) - parseFloat(b));
    const maxV = g.sameUnit ? Math.max(...members.map((m) => Math.abs(m.ind.last.Value))) || 1 : 0;
    const unit = g.sameUnit ? unitShort(members[0].ind.unit) : "";
    const rows = members.map((m, k) => {
      const i = m.ind, w = g.sameUnit ? Math.max(2, (Math.abs(i.last.Value) / maxV) * 100) : 0;
      return `<button class="sub" data-code="${i.code}" style="--sc:${seriesColor(g.tn, k)}">
        <span class="sl"><i></i>${esc(m.label)}</span>
        ${g.sameUnit ? `<span class="track"><span style="width:${w.toFixed(1)}%"></span></span>` : `<span class="track none">${spark(i, 120, 22, seriesColor(g.tn, k))}</span>`}
        <span class="sv num">${fmt(i.last.Value)}<small>${g.sameUnit ? "" : esc(unitShort(i.unit))}</small></span>
        <span class="sy">${yrChip(i.last.Year)}</span></button>`;
    }).join("");
    return `<article class="gcard" style="--tc:var(--t${g.tn})">
      <div class="g-top"><div><h3 class="name">${esc(g.name)}</h3><span class="code">${codes[0]}–${codes[codes.length - 1]} · ${members.length} sub-indicators${unit ? " · " + esc(unit) : ""}</span></div>
      <button class="g-open" data-group="${g.id}" aria-label="Compare ${esc(g.name)} over time">${g.sameUnit ? "Compare trends" : "See trends"}</button></div>
      <div class="subs">${rows}</div></article>`;
  }
  function matches(i, q) { return !q || i.name.toLowerCase().includes(q) || i.code.includes(q) || (i.group && i.group.name.toLowerCase().includes(q)) || (i.last.Author || "").toLowerCase().includes(q); }
  function renderSections() {
    const q = QUERY.toLowerCase();
    let html = "";
    THEMES.forEach((t) => {
      if (ACTIVE && ACTIVE !== t.n) return;
      const parts = []; let shown = [];
      t.entries.forEach((e) => {
        if (e.type === "one") { if (e.ind.dash && matches(e.ind, q)) { parts.push(card(e.ind)); shown.push(e.ind); } }
        else { const ms = e.group.members.filter((m) => m.ind.dash && matches(m.ind, q)); if (ms.length) { parts.push(ms.length > 1 ? groupCard(e.group, ms) : card(ms[0].ind)); shown = shown.concat(ms.map((m) => m.ind)); } }
      });
      if (!parts.length) return;
      const newest = Math.max(...shown.map((i) => i.last.Year)), oldest = Math.min(...shown.map((i) => i.last.Year));
      html += `<section class="section" id="theme-${t.n}" style="--tc:var(--t${t.n})">
        <div class="sec-head"><span class="badge">${ICONS[t.n] || ""}</span><div><h2>${esc(t.name)}</h2>
        <div class="sub-h">${shown.length} indicator${shown.length > 1 ? "s" : ""} · latest figures from ${oldest === newest ? newest : oldest + " to " + newest}</div></div></div>
        <div class="cards">${parts.join("")}</div></section>`;
    });
    $("#sections").innerHTML = html || `<p class="empty">No indicator matches “${esc(QUERY)}”. Try a shorter word, such as “rice” or “poverty”.</p>`;
  }

  /* ---------- detail drawer ---------- */
  function niceTicks(lo, hi, n = 5) {
    if (lo === hi) { lo -= 1; hi += 1; }
    const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
    for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(10));
    return t;
  }
  /* lines: [{ind, color, label}] — all in the same unit */
  function lineChart(lines, unit, H = 260) {
    const W = 600, L = 52, R = 16, T = 16, B = 30;
    const vs = [].concat(...lines.map((l) => l.ind.series.map((r) => r.Value)));
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (lo >= 0 && lo / (hi || 1) < 0.35) lo = 0;
    const ticks = niceTicks(lo, hi); lo = ticks[0]; hi = ticks[ticks.length - 1];
    const y0 = YEARS[0], y1 = YEARS[YEARS.length - 1];
    const px = (y) => L + ((y - y0) / (y1 - y0)) * (W - L - R);
    const py = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    let g = ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${py(t)}" y2="${py(t)}"/><text class="ax" x="${L - 8}" y="${py(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join("");
    g += YEARS.filter((y, k) => YEARS.length <= 8 || k % 2 === 0 || y === y1).map((y) => `<text class="ax" x="${px(y)}" y="${H - 8}" text-anchor="middle">${y}</text>`).join("");
    const single = lines.length === 1;
    lines.forEach((l) => {
      const pts = l.ind.series.map((r) => [px(r.Year), py(r.Value), r]);
      const line = pts.map((p, k) => (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
      if (single) g += `<path d="${line}L${pts[pts.length - 1][0].toFixed(1)} ${py(lo)}L${pts[0][0].toFixed(1)} ${py(lo)}Z" fill="${l.color}" fill-opacity=".13"/>`;
      g += `<path d="${line}" fill="none" stroke="${l.color}" stroke-width="2.4" stroke-linejoin="round"/>`;
      g += pts.map((p, k) => { const last = k === pts.length - 1; return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${last ? 5 : 3.2}" fill="${last && single ? "var(--saffron)" : l.color}" stroke="var(--surface)" stroke-width="2"><title>${esc(l.label)} ${p[2].Year}: ${fmt(p[2].Value)} ${esc(unitShort(unit))}</title></circle>`; }).join("");
      const e = pts[pts.length - 1];
      g += `<text x="${Math.min(e[0], W - R - 2)}" y="${e[1] - 10}" text-anchor="end" font-weight="700" font-size="12.5" fill="var(--ink)" font-family="var(--body)">${fmt(e[2].Value)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(lines.map((l) => l.label).join(", "))} by year">${g}</svg>`;
  }
  function sourceCell(r) {
    return `${esc(r.Author)}${r.Report ? " — " + (r.URL ? `<a href="${esc(r.URL)}" target="_blank" rel="noopener">${esc(r.Report)}</a>` : esc(r.Report)) : r.URL ? ` <a href="${esc(r.URL)}" target="_blank" rel="noopener">link</a>` : ""}${r.Remark ? `<div class="note">${esc(r.Remark)}</div>` : ""}`;
  }
  function showDrawer(tn, html, hash) {
    $("#drawer").style.setProperty("--tc", `var(--t${tn})`);
    $("#d-body").innerHTML = html;
    $("#scrim").hidden = false; $("#drawer").hidden = false;
    requestAnimationFrame(() => { $("#scrim").classList.add("open"); $("#drawer").classList.add("open"); });
    $("#drawer").scrollTop = 0; $("#d-close").focus();
    try { history.replaceState(null, "", "#" + hash); } catch (e) { }
  }
  function openDetail(code) {
    const i = IND.find((x) => x.code === code); if (!i) return;
    const rows = i.series.slice().reverse();
    const g = i.group;
    const crumbs = g ? `<button class="crumb" data-group="${g.id}">${esc(g.name)}</button>` : "";
    showDrawer(i.tn, `
      <span class="d-theme"><span class="ic">${ICONS[i.tn] || ""}</span>${i.tn}. ${esc(i.theme)} · ${i.code}</span>
      ${crumbs ? `<div class="crumbs">Part of ${crumbs}</div>` : ""}
      <h2 id="d-title">${esc(i.name)}</h2>
      <div class="d-big"><span class="val num">${fmt(i.last.Value)}</span><span class="unit">${esc(i.unit === "-" ? "" : i.unit)}</span></div>
      <div class="d-meta">${yrChip(i.last.Year)}<span>${FRESH_LABEL[fresh(i.last.Year)]}</span>${deltaText(i)}</div>
      <div class="chart">${lineChart([{ ind: i, color: `var(--t${i.tn})`, label: i.name }], i.unit)}</div>
      <div class="d-table-wrap"><table class="d-table"><thead><tr><th>Year</th><th style="text-align:right">Value</th><th>Source</th></tr></thead><tbody>
      ${rows.map((r, k) => `<tr class="${k === 0 ? "latest" : ""}"><td class="num">${r.Year}</td><td class="v num">${fmt(r.Value)}</td><td>${sourceCell(r)}</td></tr>`).join("")}
      </tbody></table></div>`, "i" + code.replace(".", "-"));
  }
  function findGroup(id) { for (const t of THEMES) for (const e of t.entries) if (e.type === "group" && e.group.id === id) return e.group; return null; }
  function openGroup(id) {
    const g = findGroup(id); if (!g) return;
    const ms = g.members, first = ms[0].ind;
    let body = "";
    const legend = `<div class="legend-s">${ms.map((m, k) => `<button class="lg" data-code="${m.ind.code}" style="--sc:${seriesColor(g.tn, k)}"><i></i>${esc(m.label)} <b class="num">${fmt(m.ind.last.Value)}</b> ${yrChip(m.ind.last.Year)}</button>`).join("")}</div>`;
    if (g.sameUnit) {
      const years = Array.from(new Set([].concat(...ms.map((m) => m.ind.series.map((r) => r.Year))))).sort((a, b) => b - a);
      body = legend + `<div class="chart">${lineChart(ms.map((m, k) => ({ ind: m.ind, color: seriesColor(g.tn, k), label: m.label })), first.unit, 280)}</div>
        <div class="d-table-wrap"><table class="d-table"><thead><tr><th>Year</th>${ms.map((m) => `<th style="text-align:right">${esc(m.label)}</th>`).join("")}</tr></thead><tbody>
        ${years.map((y) => `<tr><td class="num">${y}</td>${ms.map((m) => { const r = m.ind.series.find((x) => x.Year === y); return `<td class="v num">${r ? fmt(r.Value) : "–"}</td>`; }).join("")}</tr>`).join("")}
        </tbody></table></div><p class="note">Unit: ${esc(first.unit === "-" ? "index" : first.unit)}. Open a sub-indicator above to see its sources.</p>`;
    } else {
      body = legend + ms.map((m, k) => `<h3 class="d-sub">${esc(m.label)} <span>${esc(m.ind.unit)}</span></h3><div class="chart">${lineChart([{ ind: m.ind, color: seriesColor(g.tn, k), label: m.label }], m.ind.unit, 200)}</div>`).join("");
    }
    showDrawer(g.tn, `<span class="d-theme"><span class="ic">${ICONS[g.tn] || ""}</span>${g.tn}. ${esc(first.theme)} · ${ms.length} sub-indicators</span>
      <h2 id="d-title">${esc(g.name)}</h2>${body}`, g.id);
  }
  function closeDetail() {
    $("#scrim").classList.remove("open"); $("#drawer").classList.remove("open");
    setTimeout(() => { $("#scrim").hidden = true; $("#drawer").hidden = true; }, 220);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { }
  }

  /* ---------- download picker ---------- */
  function renderPicker() {
    const q = ($("#pk-q").value || "").trim().toLowerCase();
    $("#pk-list").innerHTML = THEMES.map((t) => {
      const items = t.inds.filter((i) => i.dl && matches(i, q)); if (!items.length) return "";
      const on = items.filter((i) => SELECTED.has(i.code)).length;
      return `<fieldset class="pk-theme" style="--tc:var(--t${t.n})"><legend><label><input type="checkbox" data-theme-box="${t.n}" ${on === items.length ? "checked" : ""} ${on > 0 && on < items.length ? 'data-mixed="1"' : ""}> <span class="ic">${ICONS[t.n] || ""}</span>${t.n}. ${esc(t.name)}</label><span class="n">${on}/${items.length}</span></legend>
        ${items.map((i) => `<label class="pk-item${i.group ? " is-sub" : ""}"><input type="checkbox" data-pick="${i.code}" ${SELECTED.has(i.code) ? "checked" : ""}><span class="c">${i.code}</span><span class="t">${i.group ? `<em>${esc(i.group.name)}:</em> ${esc(i.sub)}` : esc(i.name)}</span><span class="y">${i.last.Year}</span></label>`).join("")}</fieldset>`;
    }).join("") || `<p class="empty">No indicator matches “${esc(q)}”.</p>`;
    $$("#pk-list [data-mixed]").forEach((b) => { b.indeterminate = true; });
    const fmtSel = $("input[name=pk-fmt]:checked").value;
    $("#pk-count").textContent = `${SELECTED.size} of ${IND.filter((i) => i.dl).length} indicators selected`;
    $("#pk-go").disabled = SELECTED.size === 0;
    $("#pk-go").textContent = SELECTED.size === 0 ? "Select at least one indicator" : `Download ${fmtSel === "pdf" ? "PDF report" : "CSV"} (${SELECTED.size})`;
    $("#pk-csvopt").hidden = fmtSel !== "csv";
  }
  function openPicker(format) {
    if (!SELECTED.size) IND.forEach((i) => { if (i.dl) SELECTED.add(i.code); });
    $(`input[name=pk-fmt][value=${format}]`).checked = true;
    $("#pk-q").value = "";
    renderPicker();
    $("#picker").hidden = false; $("#scrim2").hidden = false;
    requestAnimationFrame(() => { $("#picker").classList.add("open"); $("#scrim2").classList.add("open"); });
    $("#pk-q").focus();
  }
  function closePicker() {
    $("#picker").classList.remove("open"); $("#scrim2").classList.remove("open");
    setTimeout(() => { $("#picker").hidden = true; $("#scrim2").hidden = true; }, 200);
  }
  function selectedInds() { return IND.filter((i) => i.dl && SELECTED.has(i.code)); }

  /* ---------- downloads ---------- */
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
  function save(blob, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const ascii = (s) => String(s || "").replace(/[​-‍﻿]/g, "").replace(/–|—/g, "-").replace(/²/g, "2").replace(/[^\x20-\x7E -ÿ]/g, "").trim();
  const csvLine = (r) => r.map((c) => { c = String(c == null ? "" : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(",");
  function downloadCSV(inds, allYears) {
    let lines;
    if (allYears) {
      lines = [["Code", "Theme", "Indicator", "Group", "Sub-indicator", "Year", "Value", "Unit", "Remark", "Source", "Report", "URL"]];
      inds.forEach((i) => i.series.forEach((r) => lines.push([i.code, i.theme, i.name, i.group ? i.group.name : "", i.sub || "", r.Year, r.Value, i.unit, r.Remark, r.Author, r.Report, r.URL])));
    } else {
      lines = [["Code", "Theme", "Indicator", "Group", "Sub-indicator", "Latest value", "Unit", "Latest year", "Previous value", "Previous year", "Source", "Report", "URL"]];
      inds.forEach((i) => lines.push([i.code, i.theme, i.name, i.group ? i.group.name : "", i.sub || "", i.last.Value, i.unit, i.last.Year, i.prev ? i.prev.Value : "", i.prev ? i.prev.Year : "", i.last.Author, i.last.Report, i.last.URL]));
    }
    save(new Blob(["﻿" + lines.map(csvLine).join("\n")], { type: "text/csv;charset=utf-8" }), `cambodia-fact-and-figure-${allYears ? "all-years" : "latest"}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast(`Downloaded ${inds.length} indicators as CSV`);
  }
  /* PDF fonts: Open Sans Light / ExtraBold (assets/fonts). Titles in Halden Solid come as pre-rendered images
     (assets/pdf-titles), so the font file itself is never published. */
  const FONT_FILES = { "OpenSans-light": "assets/fonts/OpenSans-300Light.ttf", "OpenSans-extrabold": "assets/fonts/OpenSans-800ExtraBold.ttf" };
  let TITLE_IMGS = null;
  async function loadTitleImages() {
    if (TITLE_IMGS) return TITLE_IMGS;
    TITLE_IMGS = {};
    try {
      const man = await (await fetch("assets/pdf-titles/manifest.json")).json();
      await Promise.all(Object.entries(man).map(async ([text, m]) => {
        const blob = await (await fetch(m.file)).blob();
        const url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
        TITLE_IMGS[text] = Object.assign({ url }, m);
      }));
    } catch (e) { }
    return TITLE_IMGS;
  }
  /* Draws text in Halden Solid (image) with its baseline at y; falls back to the given font. */
  function titleText(doc, text, x, y, pt, F, color) {
    const m = TITLE_IMGS && TITLE_IMGS[text];
    if (m) { const k = (pt * 0.3528) / m.px; doc.addImage(m.url, "PNG", x - m.pad * k, y - m.base * k, m.w * k, m.h * k, undefined, "FAST"); return; }
    doc.setFont(...F); doc.setFontSize(pt); doc.setTextColor(...color); doc.text(text, x, y);
  }
  const FONT_CACHE = {};
  async function fontB64(path) {
    if (path in FONT_CACHE) return FONT_CACHE[path];
    try {
      const res = await fetch(path); if (!res.ok) throw 0;
      const bytes = new Uint8Array(await res.arrayBuffer()); let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      FONT_CACHE[path] = btoa(bin);
    } catch (e) { FONT_CACHE[path] = null; }
    return FONT_CACHE[path];
  }
  async function setupFonts(doc) {
    const have = {};
    for (const [key, path] of Object.entries(FONT_FILES)) {
      const b64 = await fontB64(path); if (!b64) continue;
      const [fam, style] = key.split("-"); const file = path.split("/").pop();
      doc.addFileToVFS(file, b64); doc.addFont(file, fam, style); have[key] = true;
    }
    const body = have["OpenSans-light"] ? ["OpenSans", "light"] : ["helvetica", "normal"];
    const bold = have["OpenSans-extrabold"] ? ["OpenSans", "extrabold"] : ["helvetica", "bold"];
    const title = bold;
    return { body, bold, title };
  }
  const pdfText = (s) => String(s == null ? "" : s).replace(/[​-‍﻿]/g, "").replace(/[^\x20-\x7E -ÿ–—‘’“”•…²]/g, "").trim();

  async function downloadPDF(inds) {
    if (!window.jspdf || !window.jspdf.jsPDF) { toast("The PDF tool did not load. Check your connection and try again."); return; }
    toast("Preparing the PDF…");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const F = await setupFonts(doc); await loadTitleImages();
    const PW = 210, PH = 297, M = 10, GAP = 6, COLW = (PW - 2 * M - GAP) / 2, TOP = 11, BOT = PH - 11;
    const INK = [20, 33, 61], MUTED = [96, 110, 130], SAF = [176, 112, 0], RULE = [226, 232, 236];
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const sel = new Set(inds.map((i) => i.code));
    const y0 = YEARS[0], y1 = YEARS[YEARS.length - 1];

    // numbered sources, in order of first use
    const REFS = [], REFIX = {};
    const refOf = (r) => {
      const k = [r.Author, r.Report].map((x) => pdfText(x)).filter(Boolean).join(", ") || "Source not given";
      if (!(k in REFIX)) { REFIX[k] = REFS.length + 1; REFS.push({ k, url: r.URL || "" }); }
      return REFIX[k];
    };

    // page 1 header
    titleText(doc, TITLE, M, 16, 20, F.title, INK);
    doc.setFont(...F.bold); doc.setFontSize(8.5); doc.setTextColor(...INK);
    doc.text(`Collected, compiled and updated by VAM · Printed on ${today}`, M, 21.5);
    doc.setFont(...F.body); doc.setFontSize(6.6); doc.setTextColor(...MUTED);
    doc.text(`Latest published figure for ${inds.length} indicators. Line: trend ${y0}–${y1}, dot = latest figure. Arrow: change since the previous figure. Small number: source, listed at the end.`, M, 25.5);
    doc.setDrawColor(...INK); doc.setLineWidth(0.4); doc.line(M, 27.8, PW - M, 27.8);

    // two-column flow
    let col = 0, cy = 31, colTop = 31;
    const X = () => M + col * (COLW + GAP);
    const room = (h) => {
      if (cy + h <= BOT) return;
      if (col === 0) { col = 1; cy = colTop; } else { doc.addPage(); col = 0; colTop = cy = TOP; }
    };

    const NAMEW = 52, LH = 2.5;
    const sparkline = (i, x, y, w, h, rgb) => {
      const s = i.series; if (s.length < 2) return;
      const vs = s.map((r) => r.Value); let lo = Math.min(...vs), hi = Math.max(...vs); if (hi === lo) { hi += 1; lo -= 1; }
      const px = (yr) => x + ((yr - y0) / Math.max(1, y1 - y0)) * w, py = (v) => y + h - ((v - lo) / (hi - lo)) * h;
      doc.setDrawColor(...RULE); doc.setLineWidth(0.15); doc.line(x, y + h + 0.35, x + w, y + h + 0.35);
      doc.setDrawColor(...rgb); doc.setLineWidth(0.3);
      for (let k = 1; k < s.length; k++) doc.line(px(s[k - 1].Year), py(s[k - 1].Value), px(s[k].Year), py(s[k].Value));
      const e = s[s.length - 1]; doc.setFillColor(...SAF); doc.circle(px(e.Year), py(e.Value), 0.45, "F");
    };
    const arrow = (i, x, yc) => {
      if (!i.prev) return; const d = i.last.Value - i.prev.Value; doc.setFillColor(...MUTED);
      if (d > 0) doc.triangle(x, yc + 0.7, x + 1.6, yc + 0.7, x + 0.8, yc - 0.7, "F");
      else if (d < 0) doc.triangle(x, yc - 0.7, x + 1.6, yc - 0.7, x + 0.8, yc + 0.7, "F");
      else doc.rect(x, yc - 0.15, 1.6, 0.3, "F");
    };
    const valueText = (i) => { const u = unitShort(i.unit); return fmt(i.last.Value) + (u === "%" ? "%" : ""); };
    const nameText = (label, i, withUnit) => { const u = unitShort(i.unit); return pdfText(label) + (withUnit && u && u !== "%" ? ` (${pdfText(u)})` : ""); };

    const rowH = (txt, indent) => { doc.setFont(...F.body); doc.setFontSize(6.6); return doc.splitTextToSize(txt, NAMEW - indent).length * LH + 1.1; };
    const drawRow = (i, label, indent, rgb, withUnit) => {
      const txt = nameText(label, i, withUnit);
      doc.setFont(...F.body); doc.setFontSize(6.6);
      const lines = doc.splitTextToSize(txt, NAMEW - indent), h = lines.length * LH + 1.1;
      room(h); const x = X(), base = cy + 2.3, mid = cy + h / 2;
      doc.setTextColor(...INK); doc.text(lines, x + indent, base);
      sparkline(i, x + NAMEW + 1, mid - 1.3, 13, 2.4, rgb);
      doc.setFont(...F.bold); doc.setFontSize(7); doc.setTextColor(...INK);
      doc.text(valueText(i), x + 79, mid + 0.9, { align: "right" });
      arrow(i, x + 79.8, mid + 0.1);
      doc.setFontSize(6.3); doc.setTextColor(...SAF); doc.text(String(i.last.Year), x + 82.6, mid + 0.9);
      doc.setFont(...F.body); doc.setFontSize(4.6); doc.setTextColor(...MUTED); doc.text(String(refOf(i.last)), x + 88.2, mid - 0.2);
      doc.setDrawColor(...RULE); doc.setLineWidth(0.12); doc.line(x, cy + h, x + COLW, cy + h);
      cy += h;
    };

    THEMES.forEach((t) => {
      const items = t.inds.filter((i) => sel.has(i.code)); if (!items.length) return;
      const rgb = THEME_RGB[t.n] || INK;
      room(5.6 + rowH(items[0].name, 0) + (items[0].group ? 3.6 : 0));
      if (cy > colTop) cy += 1.6;
      doc.setFillColor(...rgb); doc.rect(X(), cy, COLW, 5, "F");
      titleText(doc, `${t.n}. ${t.name}`, X() + 2, cy + 3.7, 8.5, F.title, [255, 255, 255]);
      cy += 5.6;
      let lastGroup = null;
      items.forEach((i) => {
        if (i.group && i.group !== lastGroup) {
          room(3.4 + rowH(i.sub, 2.5));
          const u = i.group.sameUnit ? unitShort(i.unit) : "";
          doc.setFont(...F.bold); doc.setFontSize(6.6); doc.setTextColor(...INK);
          doc.text(pdfText(i.group.name) + (u && u !== "%" ? ` (${pdfText(u)})` : ""), X(), cy + 2.4);
          cy += 3.4;
        }
        lastGroup = i.group || null;
        if (i.group) drawRow(i, i.sub, 2.5, rgb, !i.group.sameUnit);
        else drawRow(i, i.name, 0, rgb, true);
      });
    });

    // numbered source list
    room(5.6 + 6); if (cy > colTop) cy += 1.6;
    doc.setFillColor(...INK); doc.rect(X(), cy, COLW, 5, "F");
    doc.setFont(...F.bold); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255); doc.text("Sources", X() + 2, cy + 3.5);
    cy += 6;
    REFS.forEach((r, n) => {
      doc.setFont(...F.body); doc.setFontSize(6.2);
      const lines = doc.splitTextToSize(r.k, COLW - 5), h = lines.length * 2.4 + 0.6;
      room(h);
      doc.setFont(...F.bold); doc.setTextColor(...SAF); doc.text(String(n + 1), X() + 3, cy + 2.2, { align: "right" });
      doc.setFont(...F.body); doc.setTextColor(...INK); doc.text(lines, X() + 4.5, cy + 2.2);
      cy += h;
    });

    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p); doc.setFont(...F.body); doc.setFontSize(6.3); doc.setTextColor(...MUTED);
      doc.text(`${TITLE} · Collected, compiled and updated by VAM · Printed on ${today}`, M, PH - 6); doc.text(`${p} / ${n}`, PW - M, PH - 6, { align: "right" });
    }
    doc.save(`cambodia-fact-and-figure-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast(`Report downloaded: ${inds.length} indicators on ${n} page${n > 1 ? "s" : ""}`);
  }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      if (e.target.closest("#picker")) return;
      const gr = e.target.closest("[data-group]"); if (gr) { openGroup(gr.dataset.group); return; }
      const c = e.target.closest("[data-code]"); if (c) { openDetail(c.dataset.code); return; }
      const t = e.target.closest(".chip"); if (t) {
        ACTIVE = Number(t.dataset.t); renderChips(); renderSections();
        const target = ACTIVE ? $("#theme-" + ACTIVE) : $("#sections");
        if (target) target.scrollIntoView({ block: "start" });
      }
    });
    $("#d-close").addEventListener("click", closeDetail);
    $("#scrim").addEventListener("click", closeDetail);
    $("#scrim2").addEventListener("click", closePicker);
    $("#pk-close").addEventListener("click", closePicker);
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("#picker").hidden) closePicker(); else if (!$("#drawer").hidden) closeDetail();
    });
    $("#q").addEventListener("input", (e) => { QUERY = e.target.value.trim(); renderSections(); });
    $("#pdf").addEventListener("click", () => openPicker("pdf"));
    $("#csv").addEventListener("click", () => openPicker("csv"));
    $("#pk-q").addEventListener("input", renderPicker);
    $$("input[name=pk-fmt]").forEach((r) => r.addEventListener("change", renderPicker));
    $("#pk-list").addEventListener("change", (e) => {
      const b = e.target;
      if (b.dataset.pick) { b.checked ? SELECTED.add(b.dataset.pick) : SELECTED.delete(b.dataset.pick); }
      if (b.dataset.themeBox) {
        const q = ($("#pk-q").value || "").trim().toLowerCase();
        const t = THEMES.find((x) => x.n === Number(b.dataset.themeBox));
        t.inds.filter((i) => i.dl && matches(i, q)).forEach((i) => (b.checked ? SELECTED.add(i.code) : SELECTED.delete(i.code)));
      }
      renderPicker();
    });
    $("#pk-all").addEventListener("click", () => { IND.forEach((i) => { if (i.dl) SELECTED.add(i.code); }); renderPicker(); });
    $("#pk-none").addEventListener("click", () => { SELECTED.clear(); renderPicker(); });
    $("#pk-head").addEventListener("click", () => { SELECTED.clear(); HEADLINE.forEach(([c]) => { const i = IND.find((x) => x.code === c); if (i && i.dl) SELECTED.add(c); }); renderPicker(); });
    $("#pk-go").addEventListener("click", () => {
      const inds = selectedInds(); if (!inds.length) return;
      if ($("input[name=pk-fmt]:checked").value === "pdf") downloadPDF(inds).catch((e) => toast("The PDF could not be made: " + e.message));
      else downloadCSV(inds, $("input[name=pk-years]:checked").value === "all");
    });
    const bar = $(".bar"), themes = $(".themes");
    window.__ffFit = () => { themes.style.setProperty("--bar-h", bar.offsetHeight + "px"); const sticky = getComputedStyle(themes).position === "sticky"; document.documentElement.style.setProperty("--stick", (bar.offsetHeight + (sticky ? themes.offsetHeight : 0)) + "px"); };
    __ffFit(); window.addEventListener("resize", __ffFit);
  }

  async function start() {
    let rows;
    try { rows = await loadLive(); SOURCE = "live"; } catch (e) { rows = await loadFallback(); SOURCE = "fallback"; }
    try { VIS = await loadVisibility(); } catch (e) { VIS = {}; }
    build(rows);
    renderStatus(); renderHeadline(); renderChips(); renderSections(); window.__ffFit();
    let m = /^#i(\d+)-(\d+)$/.exec(location.hash); if (m) openDetail(m[1] + "." + m[2]);
    m = /^#(g\d+-\d+)$/.exec(location.hash); if (m) openGroup(m[1]);
  }
  bind(); start().catch((e) => { $("#sections").innerHTML = `<p class="empty">The data could not be loaded (${esc(e.message)}). Refresh the page to try again.</p>`; });
})();
