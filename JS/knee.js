function kneePoint(caps, values){
  const valid = values.map(v => Number.isFinite(v) ? v : NaN);
  const slopes = [];
  for (let i=1;i<valid.length;i++){
    if (!Number.isFinite(valid[i-1]) || !Number.isFinite(valid[i])) slopes.push(NaN);
    else slopes.push(valid[i] - valid[i-1]);
  }
  const finiteSlopes = slopes.filter(v => Number.isFinite(v));
  if (!finiteSlopes.length) return null;
  const maxSlope = Math.max(...finiteSlopes);
  const threshold = maxSlope * 0.15;
  for (let i=0;i<slopes.length;i++){
    if (Number.isFinite(slopes[i]) && slopes[i] < threshold) return caps[i];
  }
  return caps[caps.length - 1];
}
