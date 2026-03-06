async function runSweepAndRecommend(){
  const maxCap = Math.max(0, Number(el.sweepMaxCap.value) || 0);
  const stepCap = Math.max(0.5, Number(el.sweepStepCap.value) || 1);
  const maxKw = Math.max(0, Number(el.sweepMaxKw.value) || 0);
  const stepKw = Math.max(0.5, Number(el.sweepStepKw.value) || 1);
  const autoObj = el.autoObj.value;
  const scaleYear = scaleToYear();

  const caps = [];
  for (let c=0;c<=maxCap + 1e-9;c+=stepCap) caps.push(Math.round(c/stepCap)*stepCap);
  const pows = [];
  for (let p=0;p<=maxKw + 1e-9;p+=stepKw) pows.push(Math.round(p/stepKw)*stepKw);

  if (!caps.length || !pows.length) return;

  const baseline = runSimulationFor(0, 0);
  const baseFix = baseline.fixed0;
  const baseDyn = baseline.dyn0Cost;

  const bestSavingsFix = [];
  const bestSavingsDyn = [];
  const bestRoiFix = [];
  const bestRoiDyn = [];
  const bestPowerFix = [];
  const bestPowerDyn = [];

  let bestOverall = null;
  const total = caps.length * pows.length;
  let done = 0;

  for (const cap of caps){
    let bestFix = { savings:-Infinity, roi:null, pmax:null };
    let bestDyn = { savings:-Infinity, roi:null, pmax:null };

    for (const pmax of pows){
      const r = runSimulationFor(cap, pmax);
      const cost = batteryCostEUR(cap);

      const saveFix = baseFix - r.fixed1;
      const annualFix = saveFix * scaleYear;
      const roiFix = annualFix > 0 ? cost / annualFix : null;

      if (saveFix > bestFix.savings){
        bestFix = { savings: saveFix, roi: roiFix, pmax };
      }

      if (dynPrices && baseDyn != null && r.dyn1Cost != null){
        const saveDyn = baseDyn - r.dyn1Cost;
        const annualDyn = saveDyn * scaleYear;
        const roiDyn = annualDyn > 0 ? cost / annualDyn : null;

        if (saveDyn > bestDyn.savings){
          bestDyn = { savings: saveDyn, roi: roiDyn, pmax };
        }
      }

      done++;
      setProgress(done / total * 100, `Sweep ${done}/${total}`);
      if (done % 4 === 0) await yieldToUI();
    }

    bestSavingsFix.push(bestFix.savings);
    bestRoiFix.push(bestFix.roi);
    bestPowerFix.push(bestFix.pmax);

    if (dynPrices){
      bestSavingsDyn.push(bestDyn.savings);
      bestRoiDyn.push(bestDyn.roi);
      bestPowerDyn.push(bestDyn.pmax);
    } else {
      bestSavingsDyn.push(null);
      bestRoiDyn.push(null);
      bestPowerDyn.push(null);
    }

    let candidate = null;
    if (autoObj === "roi_fix" && bestFix.roi != null) candidate = { score: -bestFix.roi, cap, pmax: bestFix.pmax };
    if (autoObj === "save_fix") candidate = { score: bestFix.savings, cap, pmax: bestFix.pmax };
    if (autoObj === "roi_dyn" && bestDyn.roi != null) candidate = { score: -bestDyn.roi, cap, pmax: bestDyn.pmax };
    if (autoObj === "save_dyn" && dynPrices && bestDyn.savings != null) candidate = { score: bestDyn.savings, cap, pmax: bestDyn.pmax };

    if (candidate && (!bestOverall || candidate.score > bestOverall.score)){
      bestOverall = candidate;
    }
  }

  if (autoObj === "knee"){
    const source = dynPrices ? bestSavingsDyn : bestSavingsFix;
    const kCap = kneePoint(caps, source);
    if (kCap != null){
      const idx = caps.findIndex(c => c === kCap);
      bestOverall = {
        score: 0,
        cap: kCap,
        pmax: dynPrices ? bestPowerDyn[idx] : bestPowerFix[idx]
      };
    }
  }

  Plotly.newPlot("savingsChart", [
    { x:caps, y:bestSavingsFix, type:"scatter", mode:"lines+markers", name:"Savings fixed" },
    ...(dynPrices ? [{ x:caps, y:bestSavingsDyn, type:"scatter", mode:"lines+markers", name:"Savings dynamic" }] : [])
  ], {
    margin:{t:10,r:10,b:40,l:55},
    xaxis:{title:"Capacity (kWh)"},
    yaxis:{title:"Savings (€)"},
    hovermode:"x unified"
  }, {responsive:true});

  Plotly.newPlot("roiChart", [
    { x:caps, y:bestRoiFix, type:"scatter", mode:"lines+markers", name:"ROI fixed" },
    ...(dynPrices ? [{ x:caps, y:bestRoiDyn, type:"scatter", mode:"lines+markers", name:"ROI dynamic" }] : [])
  ], {
    margin:{t:10,r:10,b:40,l:55},
    xaxis:{title:"Capacity (kWh)"},
    yaxis:{title:"ROI (years)"},
    hovermode:"x unified"
  }, {responsive:true});

  Plotly.newPlot("powerChart", [
    { x:caps, y:bestPowerFix, type:"scatter", mode:"lines+markers", name:"Best power fixed" },
    ...(dynPrices ? [{ x:caps, y:bestPowerDyn, type:"scatter", mode:"lines+markers", name:"Best power dynamic" }] : [])
  ], {
    margin:{t:10,r:10,b:40,l:55},
    xaxis:{title:"Capacity (kWh)"},
    yaxis:{title:"Power (kW)"},
    hovermode:"x unified"
  }, {responsive:true});

  if (!bestOverall){
    lastRecommended = null;
    el.applyRecommended.disabled = true;
    el.sweepInfo.textContent = "Geen recommendation gevonden.";
    return;
  }

  const rec = runSimulationFor(bestOverall.cap, bestOverall.pmax);
  const cost = batteryCostEUR(bestOverall.cap);
  const saveFix = rec.fixed0 - rec.fixed1;
  const annualFix = saveFix * scaleYear;
  const roiFix = annualFix > 0 ? cost / annualFix : null;

  let saveDyn = null, annualDyn = null, roiDyn = null;
  if (rec.dyn0Cost != null && rec.dyn1Cost != null){
    saveDyn = rec.dyn0Cost - rec.dyn1Cost;
    annualDyn = saveDyn * scaleYear;
    roiDyn = annualDyn > 0 ? cost / annualDyn : null;
  }

  lastRecommended = {
    cap: bestOverall.cap,
    pmax: bestOverall.pmax,
    fix: { savings: saveFix, annual: annualFix, roi: roiFix },
    dyn: { savings: saveDyn, annual: annualDyn, roi: roiDyn }
  };

  el.applyRecommended.disabled = false;
  setProgress(100, "Sweep klaar");

  el.sweepInfo.innerHTML = `
    Recommended: <b>${bestOverall.cap} kWh</b> · <b>${bestOverall.pmax} kW</b><br>
    Objective: <span class="mono">${escapeHtml(autoObj)}</span>
  `;

  el.notes.innerHTML = `
    <div class="small">
      <b>Recommended</b>: ${bestOverall.cap} kWh · ${bestOverall.pmax} kW<br>
      Batterijkosten: <b>${euro(cost)}</b><br><br>
      <b>Fixed</b> — savings: ${euro(saveFix)} · annual: ${euro(annualFix)} · ROI: <b>${roiFix != null ? roiFix.toFixed(1) + " years" : "—"}</b><br>
      <b>Dynamic</b> — savings: ${saveDyn != null ? euro(saveDyn) : "—"} · annual: ${annualDyn != null ? euro(annualDyn) : "—"} · ROI: <b>${roiDyn != null ? roiDyn.toFixed(1) + " years" : "—"}</b>
      ${rec.dynMissing ? `<br><span class="warn">Missing price hours: ${rec.dynMissing}</span>` : ""}
    </div>
  `;
}
