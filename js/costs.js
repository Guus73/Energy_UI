function costFixedTotal(impKwh, expKwh, fixedImport, fixedFeedIn){
  return impKwh * fixedImport - expKwh * fixedFeedIn;
}
function costDynamicSeries(impSeries, expSeries, markup, feedInDyn){
  let cost = 0, missing=0;
  for (let i=0;i<impSeries.length;i++){
    const t = impSeries[i].t;
    const pr = priceAtHourStart(t);
    if (pr == null){
      missing++;
      continue;
    }
    cost += impSeries[i].kwh * (pr + markup) - expSeries[i].kwh * feedInDyn;
  }
  return { cost, missingHours: missing };
}
