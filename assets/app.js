/* Cambodia Fact & Figures — reads the Google Sheet "Data" tab live, falls back to data/data.json. */
(function () {
  "use strict";
  const CFG = Object.assign({ csvUrl: "", fallback: "data/data.json", firstYear: 2013 }, window.FF_CONFIG || {});
  const NOW = new Date().getFullYear();

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
  const UNIT_SHORT = { "Percent": "%", "Percent of GDP": "% of GDP", "-": "", "Million": "million", "Billion USD": "billion USD", "Tonnes/hectare": "t/ha", "Million tonnes": "million t", "Million hectares": "million ha", "Population per Sq.km": "people/km²" };

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const unitShort = (u) => (u in UNIT_SHORT ? UNIT_SHORT[u] : u || "");
  function fmt(v) {
    if (v == null || isNaN(v)) return "–";
    const a = Math.abs(v);
    const d = a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : 3;
    return Number(v).toLocaleString("en-US", { maximumFractionDigits: d });
  }
  function fresh(y) { const age = NOW - y; return age <= 1 ? "fresh" : age <= 3 ? "aging" : "stale"; }
  const FRESH_LABEL = { fresh: "Up to date", aging: "2–3 years old", stale: "4+ years old" };

  let ROWS = [], IND = [], BY = {}, THEMES = [], YEARS = [], SOURCE = "", ACTIVE = 0, QUERY = "";

  /* ---------- data ---------- */
  function normCode(c) {
    if (typeof c === "number") return c.toFixed(2);
    c = String(c || "").trim();
    return /^\d+\.\d$/.test(c) ? c + "0" : c;
  }
  function clean(rows) {
    return rows.map((r) => ({
      Year: Number(r.Year), Code: normCode(r.Code), Theme: String(r.Theme || "").trim(),
      Indicator: String(r.Indicator || "").trim(), Value: typeof r.Value === "number" ? r.Value : parseFloat(String(r.Value).replace(/,/g, "")),
      Unit: r.Unit || "", Remark: r.Remark || "", Author: r.Author || "", Report: r.Report || "",
      Source_title: r.Source_title || "", URL: r.URL || "", Published_date: r.Published_date || "", Notes: r.Notes || ""
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
  async function loadFallback() {
    const res = await fetch(CFG.fallback, { cache: "no-store" });
    return clean(await res.json());
  }
  function build(rows) {
    ROWS = rows; BY = {};
    rows.forEach((r) => { (BY[r.Code] = BY[r.Code] || []).push(r); });
    IND = Object.keys(BY).sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b)).map((code) => {
      const s = BY[code].slice().sort((a, b) => a.Year - b.Year);
      const last = s[s.length - 1], prev = s.length > 1 ? s[s.length - 2] : null;
      const tn = parseInt(code, 10);
      return { code, tn, theme: last.Theme.replace(/^\d+\.\s*/, ""), name: last.Indicator, unit: last.Unit, series: s, last, prev };
    });
    const tmap = {};
    IND.forEach((i) => { (tmap[i.tn] = tmap[i.tn] || { n: i.tn, name: i.theme, items: [] }).items.push(i); });
    THEMES = Object.values(tmap).sort((a, b) => a.n - b.n);
    const maxY = Math.max(NOW, ...rows.map((r) => r.Year));
    const minY = Math.min(CFG.firstYear, ...rows.map((r) => r.Year));
    YEARS = []; for (let y = minY; y <= maxY; y++) YEARS.push(y);
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
  function deltaText(ind) {
    if (!ind.prev) return "";
    const d = ind.last.Value - ind.prev.Value;
    const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "■";
    return `<span class="delta">${arrow} ${fmt(Math.abs(d))} since ${ind.prev.Year}</span>`;
  }
  const yrChip = (y) => `<span class="yr ${fresh(y)}" title="${FRESH_LABEL[fresh(y)]}">${y}</span>`;

  /* ---------- render ---------- */
  function renderStatus() {
    const el = $("#status");
    const live = SOURCE === "live";
    el.className = "status" + (live ? " live" : "");
    el.innerHTML = `<i></i>${live ? "Live from the Google Sheet" : "Showing the built-in copy of the data"} · ${IND.length} indicators · ${ROWS.length} figures`;
  }
  function renderHeadline() {
    $("#headline").innerHTML = HEADLINE.map(([code, label]) => {
      const i = IND.find((x) => x.code === code); if (!i) return "";
      return `<button class="hl" data-code="${code}" style="--tc:var(--t${i.tn})"><span class="lbl">${esc(label)}</span>
        <span class="val num">${fmt(i.last.Value)}<small>${esc(unitShort(i.unit))}</small></span>
        <span class="foot">${yrChip(i.last.Year)}${spark(i, 92, 28, `var(--t${i.tn})`)}</span></button>`;
    }).join("");
  }
  function renderChips() {
    const all = `<button class="chip" data-t="0" aria-pressed="${ACTIVE === 0}" style="--tc:var(--river)"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg></span>All themes <span class="n">${IND.length}</span></button>`;
    $("#chips").innerHTML = all + THEMES.map((t) =>
      `<button class="chip" data-t="${t.n}" aria-pressed="${ACTIVE === t.n}" style="--tc:var(--t${t.n})"><span class="ic">${ICONS[t.n] || ""}</span>${esc(t.name)} <span class="n">${t.items.length}</span></button>`).join("");
  }
  function card(i) {
    return `<button class="card" data-code="${i.code}" style="--tc:var(--t${i.tn})">
      <span class="top"><span class="name">${esc(i.name)}</span><span class="code">${i.code}</span></span>
      <span class="mid"><span class="val num">${fmt(i.last.Value)}<small>${esc(unitShort(i.unit))}</small></span>${spark(i, 104, 34, `var(--t${i.tn})`)}</span>
      ${strip(i)}
      <span class="bot">${yrChip(i.last.Year)}${deltaText(i)}</span></button>`;
  }
  function renderSections() {
    const q = QUERY.toLowerCase();
    let html = "", count = 0;
    THEMES.forEach((t) => {
      if (ACTIVE && ACTIVE !== t.n) return;
      const items = t.items.filter((i) => !q || i.name.toLowerCase().includes(q) || i.code.includes(q) || (i.last.Author || "").toLowerCase().includes(q));
      if (!items.length) return;
      count += items.length;
      const newest = Math.max(...items.map((i) => i.last.Year)), oldest = Math.min(...items.map((i) => i.last.Year));
      html += `<section class="section" id="theme-${t.n}" style="--tc:var(--t${t.n})">
        <div class="sec-head"><span class="badge">${ICONS[t.n] || ""}</span><div><h2>${esc(t.name)}</h2>
        <div class="sub">${items.length} indicator${items.length > 1 ? "s" : ""} · latest figures from ${oldest === newest ? newest : oldest + " to " + newest}</div></div></div>
        <div class="cards">${items.map(card).join("")}</div></section>`;
    });
    $("#sections").innerHTML = html || `<p class="empty">No indicator matches “${esc(QUERY)}”. Try a shorter word, such as “rice” or “poverty”.</p>`;
  }
  function renderCoverage() {
    const cols = `minmax(150px, 2.6fr) repeat(${YEARS.length}, minmax(16px, 1fr))`;
    let h = `<div class="matrix" style="grid-template-columns:${cols}"><div></div>` + YEARS.map((y) => `<div class="yh">${String(y).slice(2)}</div>`).join("");
    THEMES.forEach((t) => {
      h += `<div class="th" style="--tc:var(--t${t.n})">${t.n}. ${esc(t.name)}</div>`;
      t.items.forEach((i) => {
        const have = new Set(i.series.map((r) => r.Year));
        h += `<div class="rn" data-code="${i.code}" title="${esc(i.name)}">${i.code} ${esc(i.name)}</div>` +
          YEARS.map((y) => `<div class="c ${y === i.last.Year ? "last" : have.has(y) ? "on" : ""}" style="--tc:var(--t${t.n})" title="${esc(i.name)} · ${y}${have.has(y) ? ": " + fmt(i.series.find((r) => r.Year === y).Value) : ": no data"}"></div>`).join("");
      });
    });
    $("#matrix").innerHTML = h + "</div>";
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
  function bigChart(i) {
    const W = 600, H = 260, L = 52, R = 16, T = 14, B = 30;
    const s = i.series, vs = s.map((r) => r.Value);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (lo >= 0 && lo / (hi || 1) < 0.35) lo = 0;
    const ticks = niceTicks(lo, hi); lo = ticks[0]; hi = ticks[ticks.length - 1];
    const y0 = YEARS[0], y1 = YEARS[YEARS.length - 1];
    const px = (y) => L + ((y - y0) / (y1 - y0)) * (W - L - R);
    const py = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const c = `var(--t${i.tn})`;
    let g = ticks.map((t) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${py(t)}" y2="${py(t)}"/><text class="ax" x="${L - 8}" y="${py(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join("");
    g += YEARS.filter((y, k) => YEARS.length <= 8 || k % 2 === 0 || y === y1).map((y) => `<text class="ax" x="${px(y)}" y="${H - 8}" text-anchor="middle">${y}</text>`).join("");
    const pts = s.map((r) => [px(r.Year), py(r.Value), r]);
    const line = pts.map((p, k) => (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
    const area = line + `L${pts[pts.length - 1][0].toFixed(1)} ${py(lo)}L${pts[0][0].toFixed(1)} ${py(lo)}Z`;
    const dots = pts.map((p, k) => `<circle class="pt" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${k === pts.length - 1 ? 5.5 : 3.5}" fill="${k === pts.length - 1 ? "var(--saffron)" : c}" stroke="var(--surface)" stroke-width="2"><title>${p[2].Year}: ${fmt(p[2].Value)} ${esc(unitShort(i.unit))}</title></circle>`).join("");
    const e = pts[pts.length - 1];
    const lab = `<text x="${Math.min(e[0], W - R - 4)}" y="${e[1] - 12}" text-anchor="end" font-weight="700" font-size="13" fill="var(--ink)" font-family="var(--body)">${fmt(e[2].Value)}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(i.name)} by year">${g}<path d="${area}" fill="${c}" fill-opacity=".13"/><path d="${line}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/>${dots}${lab}</svg>`;
  }
  function openDetail(code) {
    const i = IND.find((x) => x.code === code); if (!i) return;
    const rows = i.series.slice().reverse();
    $("#drawer").style.setProperty("--tc", `var(--t${i.tn})`);
    $("#d-body").innerHTML = `
      <span class="d-theme"><span class="ic">${ICONS[i.tn] || ""}</span>${i.tn}. ${esc(i.theme)} · ${i.code}</span>
      <h2 id="d-title">${esc(i.name)}</h2>
      <div class="d-big"><span class="val num">${fmt(i.last.Value)}</span><span class="unit">${esc(i.unit === "-" ? "" : i.unit)}</span></div>
      <div class="d-meta">${yrChip(i.last.Year)}<span>${FRESH_LABEL[fresh(i.last.Year)]}</span>${deltaText(i)}</div>
      <div class="chart">${bigChart(i)}</div>
      <div class="d-table-wrap"><table class="d-table"><thead><tr><th>Year</th><th style="text-align:right">Value</th><th>Source</th></tr></thead><tbody>
      ${rows.map((r, k) => `<tr class="${k === 0 ? "latest" : ""}"><td class="num">${r.Year}</td><td class="v num">${fmt(r.Value)}</td>
        <td>${esc(r.Author)}${r.Report ? " — " + (r.URL ? `<a href="${esc(r.URL)}" target="_blank" rel="noopener">${esc(r.Report)}</a>` : esc(r.Report)) : r.URL ? ` <a href="${esc(r.URL)}" target="_blank" rel="noopener">link</a>` : ""}
        ${r.Remark ? `<div class="note">${esc(r.Remark)}</div>` : ""}</td></tr>`).join("")}
      </tbody></table></div>`;
    $("#scrim").hidden = false; $("#drawer").hidden = false;
    requestAnimationFrame(() => { $("#scrim").classList.add("open"); $("#drawer").classList.add("open"); });
    $("#drawer").scrollTop = 0; $("#d-close").focus();
    try { history.replaceState(null, "", "#" + "i" + code.replace(".", "-")); } catch (e) { }
  }
  function closeDetail() {
    $("#scrim").classList.remove("open"); $("#drawer").classList.remove("open");
    setTimeout(() => { $("#scrim").hidden = true; $("#drawer").hidden = true; }, 220);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { }
  }

  /* ---------- downloads ---------- */
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
  function save(blob, name) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const ascii = (s) => String(s || "").replace(/[​-‍﻿]/g, "").replace(/[^\x20-\x7E -ÿ²–—]/g, "").replace(/–|—/g, "-").replace(/²/g, "2").trim();
  function downloadCSV() {
    const head = ["Code", "Theme", "Indicator", "Latest value", "Unit", "Latest year", "Previous value", "Previous year", "Source", "Report", "URL"];
    const lines = [head].concat(IND.map((i) => [i.code, i.theme, i.name, i.last.Value, i.unit, i.last.Year, i.prev ? i.prev.Value : "", i.prev ? i.prev.Year : "", i.last.Author, i.last.Report, i.last.URL]));
    const csv = lines.map((r) => r.map((c) => { c = String(c == null ? "" : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(",")).join("\n");
    save(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `cambodia-fact-figures-latest-${new Date().toISOString().slice(0, 10)}.csv`);
    toast("Downloaded the latest figures as CSV");
  }
  function downloadPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) { toast("The PDF tool did not load. Check your connection and try again."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const PW = 210, M = 14, INK = [20, 33, 61], MUTED = [86, 102, 122], TEAL = [18, 105, 122], SAF = [201, 131, 0];
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    // cover
    doc.setFillColor(...INK); doc.rect(0, 0, PW, 78, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(30);
    doc.text("Cambodia in numbers", M, 34);
    doc.setFont("helvetica", "normal"); doc.setFontSize(12);
    doc.text("Fact & Figure Database - key national indicators", M, 44);
    doc.setFontSize(9.5); doc.setTextColor(200, 210, 225);
    doc.text(`Report generated ${today} · ${IND.length} indicators · ${ROWS.length} figures · ${SOURCE === "live" ? "live data from the Google Sheet" : "built-in data copy"}`, M, 62);
    doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("Headline figures", M, 94);
    const bw = (PW - 2 * M - 8) / 3, bh = 30;
    HEADLINE.forEach(([code, label], k) => {
      const i = IND.find((x) => x.code === code); if (!i) return;
      const x = M + (k % 3) * (bw + 4), y = 100 + Math.floor(k / 3) * (bh + 4);
      doc.setDrawColor(210, 220, 224); doc.setFillColor(246, 249, 249); doc.roundedRect(x, y, bw, bh, 2.5, 2.5, "FD");
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(label, x + 4, y + 7);
      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK); doc.text(fmt(i.last.Value), x + 4, y + 18);
      const vw = doc.getTextWidth(fmt(i.last.Value)); doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...MUTED);
      doc.text(ascii(unitShort(i.unit)), x + 6 + vw, y + 18);
      doc.setTextColor(...SAF); doc.setFont("helvetica", "bold"); doc.text(`Latest year: ${i.last.Year}`, x + 4, y + 25.5);
    });
    let y = 178;
    doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("How to read this report", M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
    const txt = "Each indicator shows its most recent published figure. Sources publish on different schedules, so the year differs from one indicator to another; always read the value together with its year. Change compares the latest figure with the previous year that has data. Full sources and links are listed with every theme.";
    doc.text(doc.splitTextToSize(txt, PW - 2 * M), M, y + 7);
    // freshness summary
    const cnt = { fresh: 0, aging: 0, stale: 0 }; IND.forEach((i) => cnt[fresh(i.last.Year)]++);
    y = 214; doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text("How recent are the figures?", M, y);
    const cols = { fresh: [47, 138, 85], aging: [185, 122, 0], stale: [176, 69, 59] }; let x0 = M; const tot = IND.length, barW = PW - 2 * M;
    ["fresh", "aging", "stale"].forEach((k) => { const w = barW * cnt[k] / tot; doc.setFillColor(...cols[k]); doc.rect(x0, y + 5, w, 7, "F"); x0 += w; });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    let lx = M; ["fresh", "aging", "stale"].forEach((k) => {
      doc.setFillColor(...cols[k]); doc.circle(lx + 1.5, y + 18.5, 1.5, "F"); doc.setTextColor(...MUTED);
      const t = `${FRESH_LABEL[k].replace("–", "-")}: ${cnt[k]} indicators`; doc.text(t, lx + 5, y + 19.5); lx += doc.getTextWidth(t) + 14;
    });
    // theme tables
    doc.addPage(); let cy = 16;
    THEMES.forEach((t) => {
      if (cy > 235) { doc.addPage(); cy = 16; }
      const rgb = THEME_RGB[t.n] || TEAL;
      doc.setFillColor(...rgb); doc.roundedRect(M, cy, PW - 2 * M, 11, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); doc.text(`${t.n}. ${ascii(t.name)}`, M + 4, cy + 7.6);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(`${t.items.length} indicators`, PW - M - 4, cy + 7.4, { align: "right" });
      doc.autoTable({
        startY: cy + 13, margin: { left: M, right: M, bottom: 18, top: 16 },
        head: [["Code", "Indicator", "Value", "Unit", "Year", "Change", "Source"]],
        body: t.items.map((i) => [i.code, ascii(i.name), fmt(i.last.Value), ascii(i.unit === "-" ? "" : i.unit), String(i.last.Year),
          i.prev ? `${i.last.Value - i.prev.Value > 0 ? "+" : ""}${fmt(i.last.Value - i.prev.Value)} (since ${i.prev.Year})` : "", ascii([i.last.Author, i.last.Report].filter(Boolean).join(", "))]),
        styles: { font: "helvetica", fontSize: 8.4, cellPadding: 2, textColor: INK, lineColor: [220, 228, 231], lineWidth: 0.1, valign: "middle" },
        headStyles: { fillColor: [244, 247, 248], textColor: MUTED, fontStyle: "bold", fontSize: 8 },
        columnStyles: { 0: { cellWidth: 11 }, 1: { cellWidth: 52 }, 2: { halign: "right", fontStyle: "bold", cellWidth: 17 }, 3: { cellWidth: 22 }, 4: { halign: "center", cellWidth: 11, textColor: SAF, fontStyle: "bold" }, 5: { cellWidth: 26, textColor: MUTED }, 6: { textColor: MUTED } },
        alternateRowStyles: { fillColor: [250, 252, 252] }
      });
      cy = doc.lastAutoTable.finalY + 10;
    });
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
      doc.text(`Cambodia in numbers · generated ${today}`, M, 289); doc.text(`Page ${p} of ${n}`, PW - M, 289, { align: "right" });
    }
    doc.save(`cambodia-in-numbers-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast("Report downloaded as PDF");
  }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener("click", (e) => {
      const c = e.target.closest("[data-code]"); if (c) { openDetail(c.dataset.code); return; }
      const t = e.target.closest(".chip"); if (t) {
        ACTIVE = Number(t.dataset.t); renderChips(); renderSections();
        const target = ACTIVE ? $("#theme-" + ACTIVE) : $("#sections");
        if (target) target.scrollIntoView({ block: "start" });
      }
    });
    $("#d-close").addEventListener("click", closeDetail);
    $("#scrim").addEventListener("click", closeDetail);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#drawer").hidden) closeDetail(); });
    $("#q").addEventListener("input", (e) => { QUERY = e.target.value.trim(); renderSections(); });
    $("#pdf").addEventListener("click", downloadPDF);
    $("#csv").addEventListener("click", downloadCSV);
    const bar = $(".bar"), themes = $(".themes");
    const fit = () => { themes.style.top = `calc(env(safe-area-inset-top, 0px) + ${bar.offsetHeight}px)`; };
    fit(); window.addEventListener("resize", fit);
  }

  async function start() {
    let rows;
    try { rows = await loadLive(); SOURCE = "live"; } catch (e) { rows = await loadFallback(); SOURCE = "fallback"; }
    build(rows);
    renderStatus(); renderHeadline(); renderChips(); renderSections(); renderCoverage();
    $("#updated").textContent = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    const m = /^#i(\d+)-(\d+)$/.exec(location.hash); if (m) openDetail(m[1] + "." + m[2]);
  }
  bind(); start().catch((e) => { $("#sections").innerHTML = `<p class="empty">The data could not be loaded (${esc(e.message)}). Refresh the page to try again.</p>`; });
})();
