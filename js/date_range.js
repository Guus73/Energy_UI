function inRange(ms){
  const tz = el.tz.value;
  const f = el.from.value ? DateTime.fromISO(el.from.value, {zone:tz}).startOf("day").toMillis() : -Infinity;
  const t = el.to.value ? DateTime.fromISO(el.to.value, {zone:tz}).endOf("day").toMillis() : Infinity;
  return ms >= f && ms <= t;
}
function computeFullRange(all){
  if (!all.length) return null;
  const tz = el.tz.value;
  return {
    minDate: DateTime.fromMillis(all[0].t, {zone:tz}).toISODate(),
    maxDate: DateTime.fromMillis(all[all.length-1].t, {zone:tz}).toISODate()
  };
}
function scaleToYear(){
  if (el.roiScale.value === "none") return 1;
  const tz = el.tz.value;
  if (!el.from.value || !el.to.value) return 1;
  const f = DateTime.fromISO(el.from.value, {zone:tz}).startOf("day");
  const t = DateTime.fromISO(el.to.value, {zone:tz}).endOf("day");
  const days = Math.max(1, t.diff(f, "days").days);
  return 365 / days;
}
