function buildEnergyChartsUrl(){
  const bzn = el.bzn.value;
  const start = el.from.value;
  const end = el.to.value;
  if (!start || !end) return null;
  return `https://api.energy-charts.info/price?bzn=${encodeURIComponent(bzn)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
}
function updatePriceUrl(){
  const url = buildEnergyChartsUrl();
  if (!url){
    el.priceUrl.textContent = "Kies eerst Van/Tot";
    el.priceUrl.href = "#";
    return;
  }
  el.priceUrl.textContent = url;
  el.priceUrl.href = url;
}
function setPriceInfo(text, cls=""){
  el.priceInfo.className = `small ${cls}`;
  el.priceInfo.textContent = text;
}
async function loadEnergyChartsJson(file){
  const text = await file.text();
  const data = JSON.parse(text);
  const ts = data.unix_seconds;
  const pr = data.price;
  const unit = String(data.unit || "").toLowerCase();

  if (!Array.isArray(ts) || !Array.isArray(pr) || ts.length !== pr.length){
    throw new Error("Ongeldig Energy-Charts bestand: verwacht unix_seconds[] + price[] met gelijke lengte.");
  }

  const scale = unit.includes("mwh") ? 1/1000 : 1;
  const map = new Map();

  for (let i=0;i<ts.length;i++){
    const ms = Number(ts[i]) * 1000;
    const p = Number(pr[i]);
    if (!Number.isFinite(ms) || !Number.isFinite(p)) continue;
    map.set(ms, p * scale);
  }

  if (map.size < 24) throw new Error("Te weinig prijzen gevonden.");
  return { map, unit: data.unit || "", scale };
}
function priceAtHourStart(ms){
  if (!dynPrices) return null;
  const dt = DateTime.fromMillis(ms, {zone:el.tz.value}).startOf("hour").toMillis();
  return dynPrices.get(dt) ?? null;
}
