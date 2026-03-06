function simulateSelfConsumption(all, cfg){
  const { capKwh, pmaxKw, rte, soc0, socMin, priorityExport } = cfg;
  const maxKwh = pmaxKw;
  const effCh = Math.sqrt(rte);
  const effDis = Math.sqrt(rte);

  let soc = clamp(soc0,0,1) * capKwh;
  const socMinKwh = clamp(socMin,0,1) * capKwh;

  let imp0=0, exp0=0, imp1=0, exp1=0;
  const tl = [];

  for (const p of all){
    if (!inRange(p.t)) continue;

    const importKwh = Math.max(0, p.import);
    const exportKwh = Math.max(0, p.export);

    imp0 += importKwh;
    exp0 += exportKwh;

    let chargeFromExport = 0;
    if (priorityExport){
      const headroom = Math.max(0, capKwh - soc);
      chargeFromExport = Math.min(maxKwh, exportKwh, headroom / effCh);
      soc += chargeFromExport * effCh;
    }

    const exportAfter = exportKwh - chargeFromExport;

    const available = Math.max(0, soc - socMinKwh);
    const canDis = Math.min(maxKwh, available);
    const delivered = canDis * effDis;
    const used = Math.min(delivered, importKwh);
    const importAfter = importKwh - used;
    soc -= used / effDis;

    imp1 += importAfter;
    exp1 += exportAfter;

    tl.push({
      t:p.t,
      import0: importKwh,
      export0: -exportKwh,
      import1: importAfter,
      export1: -exportAfter,
      soc
    });
  }

  return { imp0, exp0, imp1, exp1, timeline: tl };
}

function simulateArbitrageHeuristic(netSeries, cfg, tariff){
  const { capKwh, pmaxKw, rte, soc0, socMin, priorityExport } = cfg;
  const { markup, feedIn } = tariff;
  const maxKwh = pmaxKw;
  const effCh = Math.sqrt(rte);
  const effDis = Math.sqrt(rte);
  const socMinKwh = clamp(socMin,0,1) * capKwh;

  const pts = netSeries.map(p=>({ ...p, price: priceAtHourStart(p.t) })).filter(p=>p.price != null);
  if (!pts.length) return { cost: NaN, timeline: [], missingHours: netSeries.length };

  const prices = pts.map(p=>p.price).slice().sort((a,b)=>a-b);
  const q = p => prices[Math.floor((prices.length - 1) * p)];
  const cheap = q(0.30);
  const expensive = q(0.70);

  let soc = clamp(soc0,0,1) * capKwh;
  let cost = 0;
  const tl = [];

  for (const p of pts){
    const priceEff = p.price + markup;
    let grid = p.kwh;

    if (priorityExport && grid < 0 && soc < capKwh){
      const headroom = capKwh - soc;
      const absorb = Math.min(maxKwh, -grid, headroom / effCh);
      soc += absorb * effCh;
      grid += absorb;
    }

    if (p.price >= expensive && grid > 0 && soc > socMinKwh){
      const canDis = Math.min(maxKwh, soc - socMinKwh);
      const delivered = canDis * effDis;
      const used = Math.min(delivered, grid);
      grid -= used;
      soc -= used / effDis;
    }

    if (p.price <= cheap && soc < capKwh){
      const headroom = capKwh - soc;
      const fromGrid = Math.min(maxKwh, headroom / effCh);
      soc += fromGrid * effCh;
      grid += fromGrid;
    }

    const stepCost = (grid >= 0) ? grid * priceEff : (-grid) * (-feedIn);
    cost += stepCost;

    tl.push({
      t:p.t,
      import0: Math.max(0, p.kwh),
      export0: -Math.max(0, -p.kwh),
      import1: Math.max(0, grid),
      export1: -Math.max(0, -grid),
      soc
    });
  }

  return { cost, timeline: tl, missingHours: netSeries.length - pts.length };
}

function optimizeBatteryDP(netLoad, price, cfg, opt){
  const { capKwh, pmaxKw, rte, soc0, socMin, priorityExport } = cfg;
  const { markup, feedIn } = opt;
  const effCh = Math.sqrt(rte);
  const effDis = Math.sqrt(rte);
  const maxA = Math.max(0, pmaxKw);
  const T = netLoad.length;
  if (!T) return { grid:[], soc:[], action:[], cost:0 };

  const socMinKwh = clamp(socMin,0,1) * capKwh;
  const soc0Kwh = clamp(soc0,0,1) * capKwh;

  const socStep = Math.max(0.25, capKwh / 80);
  const nS = Math.max(2, Math.floor(capKwh / socStep) + 1);

  const aStep = Math.max(0.25, maxA / 10, socStep);
  const actions = [];
  if (maxA <= 0) {
    actions.push(0);
  } else {
    for (let a = -maxA; a <= maxA + 1e-9; a += aStep){
      actions.push(Math.round(a / aStep) * aStep);
    }
    if (actions[0] > -maxA) actions.unshift(-maxA);
    if (actions[actions.length-1] < maxA) actions.push(maxA);
  }

  function idxFromSoc(s){
    return Math.max(0, Math.min(nS-1, Math.round(clamp(s,0,capKwh) / socStep)));
  }
  function socFromIdx(i){ return i * socStep; }

  let Vnext = new Float64Array(nS);
  let Vcur = new Float64Array(nS);
  const policy = new Int16Array(T * nS);

  for (let t=T-1; t>=0; t--){
    const pr = price[t];
    for (let si=0; si<nS; si++){
      const soc = socFromIdx(si);
      let best = Number.POSITIVE_INFINITY;
      let bestAi = 0;

      for (let ai=0; ai<actions.length; ai++){
        let a = actions[ai];

        if (priorityExport && netLoad[t] < 0 && a > -netLoad[t]){
          a = -netLoad[t];
        }

        let soc2 = soc;
        if (a >= 0) soc2 = soc + a * effCh;
        else soc2 = soc + a / effDis;

        if (soc2 < socMinKwh - 1e-9 || soc2 > capKwh + 1e-9) continue;

        const s2i = idxFromSoc(soc2);
        const grid = netLoad[t] + a;
        const stepCost = (grid >= 0) ? grid * (pr + markup) : (-grid) * (-feedIn);
        const total = stepCost + Vnext[s2i];

        if (total < best){
          best = total;
          bestAi = ai;
        }
      }

      Vcur[si] = best;
      policy[t*nS + si] = bestAi;
    }
    const tmp = Vnext; Vnext = Vcur; Vcur = tmp;
  }

  let soc = soc0Kwh;
  let cost = 0;
  const outGrid = new Array(T);
  const outSoc = new Array(T);
  const outAct = new Array(T);

  for (let t=0; t<T; t++){
    const si = idxFromSoc(soc);
    let a = actions[policy[t*nS + si]];

    if (priorityExport && netLoad[t] < 0 && a > -netLoad[t]){
      a = -netLoad[t];
    }

    let soc2 = soc;
    if (a >= 0) soc2 = soc + a * effCh;
    else soc2 = soc + a / effDis;
    soc2 = clamp(soc2, socMinKwh, capKwh);

    const grid = netLoad[t] + a;
    const stepCost = (grid >= 0) ? grid * (price[t] + markup) : (-grid) * (-feedIn);
    cost += stepCost;

    outGrid[t] = grid;
    outSoc[t] = soc2;
    outAct[t] = a;
    soc = soc2;
  }

  return { grid: outGrid, soc: outSoc, action: outAct, cost };
}

function optimizeBatteryRolling(netLoad, price, cfg, opt, windowH){
  const T = netLoad.length;
  if (!T) return { grid:[], soc:[], action:[], cost:0 };

  const effCh = Math.sqrt(cfg.rte);
  const effDis = Math.sqrt(cfg.rte);
  let soc = clamp(cfg.soc0,0,1) * cfg.capKwh;
  const socMinKwh = clamp(cfg.socMin,0,1) * cfg.capKwh;

  const outGrid = new Array(T);
  const outSoc = new Array(T);
  const outAct = new Array(T);
  let totalCost = 0;

  for (let t=0; t<T; t++){
    const end = Math.min(T, t + Math.max(1, windowH|0));
    const res = optimizeBatteryDP(
      netLoad.slice(t, end),
      price.slice(t, end),
      { ...cfg, soc0: soc / Math.max(1e-9, cfg.capKwh) },
      opt
    );

    let a = res.action[0] ?? 0;
    if (cfg.priorityExport && netLoad[t] < 0 && a > -netLoad[t]){
      a = -netLoad[t];
    }

    let soc2 = soc;
    if (a >= 0) soc2 = soc + a * effCh;
    else soc2 = soc + a / effDis;
    soc2 = clamp(soc2, socMinKwh, cfg.capKwh);

    const grid = netLoad[t] + a;
    const stepCost = (grid >= 0) ? grid * (price[t] + opt.markup) : (-grid) * (-opt.feedIn);
    totalCost += stepCost;

    outGrid[t] = grid;
    outSoc[t] = soc2;
    outAct[t] = a;
    soc = soc2;
  }

  return { grid: outGrid, soc: outSoc, action: outAct, cost: totalCost };
}
