function runSimulationFor(capKwh, pmaxKw){
  const all = buildHourlyAll();
  const { imp, exp, net } = buildSeriesForCosts(all);

  const fixedImport = Number(el.fixedPrice.value) || 0;
  const fixedFeedIn = Number(el.feedInFixed.value) || 0;
  const markup = Number(el.dynMarkup.value) || 0;
  const feedInDyn = Number(el.feedInDyn.value) || 0;

  const cfg = {
    capKwh,
    pmaxKw,
    rte: clamp(Number(el.rte.value), 0.2, 1.0),
    soc0: clamp(Number(el.soc0.value), 0, 1),
    socMin: clamp(Number(el.socMin.value), 0, 1),
    priorityExport: !!el.priorityExport.checked
  };

  const imp0 = imp.reduce((s,p)=>s+p.kwh,0);
  const exp0 = exp.reduce((s,p)=>s+p.kwh,0);

  const fixed0 = costFixedTotal(imp0, exp0, fixedImport, fixedFeedIn);
  const dyn0 = dynPrices ? costDynamicSeries(imp, exp, markup, feedInDyn) : null;

  const self = simulateSelfConsumption(all, cfg);
  const fixed1 = costFixedTotal(self.imp1, self.exp1, fixedImport, fixedFeedIn);

  let dyn1Cost = null;
  let dynMissing = null;
  let timeline = self.timeline;

  if (dynPrices){
    if (el.optForecast.checked){
      const netLoad = [];
      const price = [];
      const tArr = [];
      let missing = 0;

      for (const p of net){
        const pr = priceAtHourStart(p.t);
        if (pr == null){
          missing++;
          continue;
        }
        netLoad.push(p.kwh);
        price.push(pr);
        tArr.push(p.t);
      }

      const opt = { markup, feedIn: feedInDyn };
      let res;
      if (el.optMode.value === "window"){
        const wh = Math.max(1, Number(el.optWindowH.value) || 24);
        res = optimizeBatteryRolling(netLoad, price, cfg, opt, wh);
      } else {
        res = optimizeBatteryDP(netLoad, price, cfg, opt);
      }

      dyn1Cost = res.cost;
      dynMissing = missing;

      timeline = tArr.map((t, i) => ({
        t,
        import0: Math.max(0, netLoad[i]),
        export0: -Math.max(0, -netLoad[i]),
        import1: Math.max(0, res.grid[i]),
        export1: -Math.max(0, -res.grid[i]),
        soc: res.soc[i]
      }));
    } else if (el.batMode.value === "arb"){
      const arb = simulateArbitrageHeuristic(net, cfg, { markup, feedIn: feedInDyn });
      dyn1Cost = arb.cost;
      dynMissing = arb.missingHours;
      timeline = arb.timeline;
    } else {
      const imp1 = self.timeline.map(p=>({t:p.t,kwh:p.import1}));
      const exp1 = self.timeline.map(p=>({t:p.t,kwh:-p.export1}));
      const dyn1 = costDynamicSeries(imp1, exp1, markup, feedInDyn);
      dyn1Cost = dyn1.cost;
      dynMissing = dyn1.missingHours;
      timeline = self.timeline;
    }
  }

  return {
    fixed0, fixed1,
    dyn0Cost: dyn0 ? dyn0.cost : null,
    dyn1Cost,
    dynMissing,
    timeline
  };
}
