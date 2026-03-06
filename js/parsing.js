function parseDatum(v, tz){
  const s0 = String(v ?? "").trim();
  if (!s0) return null;
  const s = s0.replace(", ", ",").replace(",", ", ");
  const fmts = [
    "dd-LL-yyyy, HH:mm:ss",
    "d-L-yyyy, H:mm:ss",
    "d-L-yyyy, HH:mm:ss",
    "dd-LL-yyyy, H:mm:ss",
    "d-LL-yyyy, H:mm:ss",
    "d-LL-yyyy, HH:mm:ss"
  ];
  for (const f of fmts){
    const dt = DateTime.fromFormat(s, f, { zone: tz });
    if (dt.isValid) return dt;
  }
  const iso = DateTime.fromISO(s0, { zone: tz });
  return iso.isValid ? iso : null;
}
function parseCommaNumber(v){
  const s = String(v ?? "").trim().replace(/\s/g,"").replace(",",".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
