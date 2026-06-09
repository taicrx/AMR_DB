let aspMonthly = [];
let antibiogram = [];
let charts = {};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("aspCsvUrl").value =
    localStorage.getItem("ASP_MONTHLY_CSV_URL") || "";
  document.getElementById("antibiogramCsvUrl").value =
    localStorage.getItem("ANTIBIOGRAM_CSV_URL") || "";
});

function saveUrls() {
  localStorage.setItem(
    "ASP_MONTHLY_CSV_URL",
    document.getElementById("aspCsvUrl").value.trim()
  );
  localStorage.setItem(
    "ANTIBIOGRAM_CSV_URL",
    document.getElementById("antibiogramCsvUrl").value.trim()
  );
  setStatus("URLs saved locally.");
}

async function loadDashboard() {
  const aspUrl = document.getElementById("aspCsvUrl").value.trim();
  const antibiogramUrl =
    document.getElementById("antibiogramCsvUrl").value.trim();

  if (!aspUrl) {
    setStatus("請先貼上 Fact_ASP_Monthly CSV URL。");
    return;
  }

  try {
    setStatus("Loading Fact_ASP_Monthly...");
    const csv = await fetchText(aspUrl);
    aspMonthly = cleanAspMonthly(parseCSV(csv));
    renderAspDashboard();

    if (antibiogramUrl) {
      setStatus("Loading Fact_Antibiogram...");
      const agCsv = await fetchText(antibiogramUrl);
      antibiogram = parseCSV(agCsv);
      renderAntibiogramTable(antibiogram.slice(0, 100));
      document.getElementById("antibiogramStatus").innerText =
        `Fact_Antibiogram loaded: ${antibiogram.length} rows.`;
    } else {
      document.getElementById("antibiogramStatus").innerText =
        "未提供 Fact_Antibiogram CSV URL，因此未載入 antibiogram。";
    }

    setStatus("Data loaded.");
  } catch (err) {
    console.error(err);
    setStatus("Load failed. 請檢查 CSV URL、發布設定或欄位名稱。");
  }
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function setStatus(text) {
  document.getElementById("dataStatus").innerText = text;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur || row.length) {
        row.push(cur);
        rows.push(row);
      }
      row = [];
      cur = "";
      if (ch === "\r" && next === "\n") i++;
    } else {
      cur += ch;
    }
  }

  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }

  const headers = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.some(x => String(x).trim() !== ""))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || "").trim()])));
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const cleaned = String(v).replace("%", "").replace(",", "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function fmtPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const num = Number(v);
  if (num <= 1) return `${(num * 100).toFixed(1)}%`;
  return `${num.toFixed(1)}%`;
}

function fmtNum(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return Number(v).toFixed(1);
}

function cleanAspMonthly(rows) {
  return rows.map(r => {
    const meropenem = toNum(r.Meropenem_DDD);
    const imipenem = toNum(r.Imipenem_DDD);
    const ertapenem = toNum(r.Ertapenem_DDD);
    const doripenem = toNum(r.Doripenem_DDD);

    return {
      ...r,
      YYYYMM: r.YYYYMM || r.Date || "",
      CRKP_Rate_num: toNum(r.CRKP_Rate),
      CRAB_Rate_num: toNum(r.CRAB_Rate),
      MRSA_Rate_num: toNum(r.MRSA_Rate),
      VRE_Rate_num: toNum(r.VRE_Rate),
      Meropenem_DDD_num: meropenem,
      Imipenem_DDD_num: imipenem,
      Ertapenem_DDD_num: ertapenem,
      Doripenem_DDD_num: doripenem,
      Total_Carbapenem_DDD_num:
        [meropenem, imipenem, ertapenem, doripenem]
          .filter(x => x !== null)
          .reduce((a, b) => a + b, 0)
    };
  }).filter(r => r.YYYYMM);
}

function renderAspDashboard() {
  if (!aspMonthly.length) return;

  const latest = aspMonthly[aspMonthly.length - 1];

  document.getElementById("kpiCRKP").innerText = fmtPct(latest.CRKP_Rate_num);
  document.getElementById("kpiCRAB").innerText = fmtPct(latest.CRAB_Rate_num);
  document.getElementById("kpiMRSA").innerText = fmtPct(latest.MRSA_Rate_num);
  document.getElementById("kpiCarbapenem").innerText =
    fmtNum(latest.Total_Carbapenem_DDD_num);

  const labels = aspMonthly.map(r => r.YYYYMM);

  renderLineChart("mdroChart", labels, [
    { label: "CRKP", data: aspMonthly.map(r => r.CRKP_Rate_num) },
    { label: "CRAB", data: aspMonthly.map(r => r.CRAB_Rate_num) },
    { label: "MRSA", data: aspMonthly.map(r => r.MRSA_Rate_num) },
    { label: "VRE",  data: aspMonthly.map(r => r.VRE_Rate_num) }
  ], "Rate");

  renderLineChart("carbapenemChart", labels, [
    { label: "Meropenem", data: aspMonthly.map(r => r.Meropenem_DDD_num) },
    { label: "Imipenem", data: aspMonthly.map(r => r.Imipenem_DDD_num) },
    { label: "Ertapenem", data: aspMonthly.map(r => r.Ertapenem_DDD_num) },
    { label: "Doripenem", data: aspMonthly.map(r => r.Doripenem_DDD_num) }
  ], "DDD");

  renderScatterChart();
  renderAiBrief();
}

function renderLineChart(canvasId, labels, datasets, yTitle) {
  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom" } },
      scales: { y: { title: { display: true, text: yTitle } } }
    }
  });
}

function renderScatterChart() {
  const canvasId = "correlationChart";
  if (charts[canvasId]) charts[canvasId].destroy();

  const points = aspMonthly
    .filter(r => r.Meropenem_DDD_num !== null && r.CRKP_Rate_num !== null)
    .map(r => ({ x: r.Meropenem_DDD_num, y: r.CRKP_Rate_num }));

  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: "scatter",
    data: {
      datasets: [{
        label: "Meropenem DDD vs CRKP",
        data: points
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { title: { display: true, text: "Meropenem DDD" } },
        y: { title: { display: true, text: "CRKP Rate" } }
      }
    }
  });
}

function changeFromPrevious(key) {
  if (aspMonthly.length < 2) return null;
  const latest = aspMonthly[aspMonthly.length - 1][key];
  const prev = aspMonthly[aspMonthly.length - 2][key];
  if (latest === null || prev === null || prev === 0) return null;
  return ((latest - prev) / prev) * 100;
}

function renderAiBrief() {
  const latest = aspMonthly[aspMonthly.length - 1];
  const crkpDelta = changeFromPrevious("CRKP_Rate_num");
  const carbDelta = changeFromPrevious("Total_Carbapenem_DDD_num");

  const riskNotes = [];

  if (latest.CRKP_Rate_num !== null && latest.CRKP_Rate_num >= 20) {
    riskNotes.push("CRKP rate ≥ 20%，建議檢視 carbapenem empirical use 與 de-escalation 流程。");
  }
  if (latest.CRAB_Rate_num !== null && latest.CRAB_Rate_num >= 30) {
    riskNotes.push("CRAB rate 偏高，建議追蹤 ICU / 呼吸照護單位群聚與感染管制策略。");
  }
  if (latest.MRSA_Rate_num !== null && latest.MRSA_Rate_num >= 50) {
    riskNotes.push("MRSA rate 偏高，建議同步檢視 vancomycin / teicoplanin 使用壓力。");
  }
  if (carbDelta !== null && carbDelta > 15) {
    riskNotes.push("Carbapenem DDD 較前期增加 >15%，建議列入 ASP morning review。");
  }

  document.getElementById("aiBrief").innerText =
`ASP Stewardship Brief

Latest period: ${latest.YYYYMM}

Key indicators:
- CRKP: ${fmtPct(latest.CRKP_Rate_num)} ${crkpDelta !== null ? `(${crkpDelta >= 0 ? "+" : ""}${crkpDelta.toFixed(1)}% vs previous)` : ""}
- CRAB: ${fmtPct(latest.CRAB_Rate_num)}
- MRSA: ${fmtPct(latest.MRSA_Rate_num)}
- VRE: ${fmtPct(latest.VRE_Rate_num)}
- Total carbapenem DDD: ${fmtNum(latest.Total_Carbapenem_DDD_num)} ${carbDelta !== null ? `(${carbDelta >= 0 ? "+" : ""}${carbDelta.toFixed(1)}% vs previous)` : ""}

Suggested ASP focus:
${riskNotes.length ? riskNotes.map(x => "- " + x).join("\n") : "- No major rule-based alert detected. Continue routine monitoring."}

Note:
This is a rule-based preliminary summary. It should support, not replace, ASP pharmacist review.`;
}

function renderAntibiogramTable(rows) {
  const tbody = document.querySelector("#antibiogramTable tbody");
  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    ["Year", "Period", "Organism", "Drug", "IsolateCount", "SusceptibilityPercent", "Location"]
      .forEach(k => {
        const td = document.createElement("td");
        td.innerText = r[k] || "";
        tr.appendChild(td);
      });
    tbody.appendChild(tr);
  });
}

function filterAntibiogram() {
  const q = document.getElementById("organismSearch").value.trim().toLowerCase();

  if (!antibiogram.length) {
    document.getElementById("antibiogramStatus").innerText =
      "Fact_Antibiogram 尚未載入。請貼上 CSV URL 後按 Load Dashboard。";
    return;
  }

  if (!q) {
    renderAntibiogramTable(antibiogram.slice(0, 100));
    return;
  }

  const rows = antibiogram
    .filter(r => String(r.Organism || "").toLowerCase().includes(q))
    .slice(0, 200);

  renderAntibiogramTable(rows);
  document.getElementById("antibiogramStatus").innerText =
    `Search result: ${rows.length} rows shown.`;
}
