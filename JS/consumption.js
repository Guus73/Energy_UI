function buildHourlyAll(){
  if (hourlyAllCache) return hourlyAllCache;

  const tz = el.tz.value;
  const cD = el.colDate.value;
  const cV = el.colValue.value;
  const cT = el.colType.value;

  const wantEan = el.ean.value || "";
  const hasEAN = consCols.includes("EAN");

  const m = new Map();
  for (const r of consRows){
    const dt = parseDatum(r[cD], tz);
    if (!dt) continue;
    const t = dt.toMillis();

    if (wantEan && hasEAN){
      const ean = String(r["EAN"] ?? "");
      if (ean && ean !== wantEan) continue;
    }

    const typ = String(r[cT] ?? "").trim();
    const val = parseCommaNumber(r[cV]);
    if (val == null) continue;

    if (!m.has(t)) m.set(t, { t, import:0, export:0, gas:0 });
    const o = m.get(t);

    if (typ === "Elektriciteit") o.import += val;
    else if (typ === "Teruglevering") o.export += val;
    else if (typ === "Gas") o.gas += val;
  }

  hourlyAllCache = Array.from(m.values()).sort((a,b)=>a.t-b.t);
  return hourlyAllCache;
}

function pickYMain(p){
  const s = el.series.value;
  if (s === "elec_import") return p.import;
  if (s === "elec_export") return -p.export;
  if (s === "elec_net") return Math.max(0, p.import - p.export);
  if (s === "gas") return p.gas;
  return p.import;
}

function buildSeriesForCosts(all){
  const imp = [], exp = [], net = [];
  for (const p of all){
    if (!inRange(p.t)) continue;
    const im = Math.max(0, p.import);
    const ex = Math.max(0, p.export);
    imp.push({ t:p.t, kwh: im });
    exp.push({ t:p.t, kwh: ex });
    net.push({ t:p.t, kwh: im - ex }); // can be negative
  }
  return { imp, exp, net };
}
