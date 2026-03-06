function groupKey(dt, agg){
  if (agg === "day") return dt.toISODate();
  if (agg === "week") return `${dt.weekYear}-W${String(dt.weekNumber).padStart(2,"0")}`;
  if (agg === "month") return dt.toFormat("yyyy-LL");
  if (agg === "year") return dt.toFormat("yyyy");
  return dt.toISO();
}
function keyToMillis(k, agg){
  const tz = el.tz.value;
  if (agg === "day") return DateTime.fromISO(k, {zone:tz}).toMillis();
  if (agg === "month") return DateTime.fromFormat(k, "yyyy-LL", {zone:tz}).toMillis();
  if (agg === "year") return DateTime.fromFormat(k, "yyyy", {zone:tz}).toMillis();
  if (agg === "week"){
    const [yy, ww] = k.split("-W");
    return DateTime.fromObject({weekYear:+yy, weekNumber:+ww, weekday:1}, {zone:tz}).toMillis();
  }
  return DateTime.fromISO(k, {zone:tz}).toMillis();
}
function aggregateSeries(points, agg){
  if (agg === "raw") return points.slice();
  const m = new Map();
  for (const p of points){
    const dt = DateTime.fromMillis(p.t, {zone:el.tz.value});
    const k = groupKey(dt, agg);
    if (!m.has(k)) m.set(k, { t:keyToMillis(k, agg) });
    const out = m.get(k);
    for (const [kk,v] of Object.entries(p)){
      if (kk === "t") continue;
      out[kk] = (out[kk] || 0) + (Number(v) || 0);
    }
  }
  return Array.from(m.values()).sort((a,b)=>a.t-b.t);
}
