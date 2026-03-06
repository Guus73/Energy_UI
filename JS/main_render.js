function render(){
  if (!consRows.length) return;

  updatePriceUrl();

  const all = buildHourlyAll();
  const range = computeFullRange(all);

  if (range){
    const fromEmpty = !el.from.value;
    const toEmpty = !el.to.value;
    const outOfRange =
      (el.from.value && (el.from.value < range.minDate || el.from.value > range.maxDate)) ||
      (el.to.value && (el.to.value < range.minDate || el.to.value > range.maxDate));
    if (fromEmpty || toEmpty || outOfRange){
      el.from.value = range.minDate;
      el.to.value = range.maxDate;
      updatePriceUrl();
    }
  }

  const filtered = all.filter(p=>inRange(p.t));
  if (!filtered.length){
    Plotly.newPlot("chart", [], {}, {responsive:true});
    return;
  }

  const agg = el.agg.value;
  let mainSeries;
  if (agg === "raw"){
    mainSeries = filtered.map(p => ({ t:p.t, y:pickYMain(p) }));
  } else {
    const m = new Map();
    for (const p of filtered){
      const dt = DateTime.fromMillis(p.t, {zone:el.tz.value});
      const k = groupKey(dt, agg);
      m.set(k, (m.get(k)||0) + pickYMain(p));
    }
    const keys = Array.from(m.keys()).sort();
    mainSeries = keys.map(k => ({ t:keyToMillis(k, agg), y:m.get(k) }));
  }

  el.kpiEnergy.textContent = mainSeries.reduce((s,p)=>s+(p.y||0),0).toFixed(2);
  el.kpiPeak.textContent = Math.max(...filtered.map(p=>pickYMain(p))).toFixed(2);

  Plotly.newPlot("chart", [{
    x: mainSeries.map(p=>new Date(p.t)),
    y: mainSeries.map(p=>p.y),
    type: agg === "raw" ? "scatter" : "bar",
    mode: agg === "raw" ? "lines" : undefined,
    hovertemplate: "%{x}<br>kWh: %{y:.3f}<extra></extra>"
  }], {
    margin:{t:10,r:10,b:40,l:55},
    xaxis:{title:"Tijd"},
    yaxis:{title:"kWh (export negatief)"},
    hovermode:"x unified"
  }, {responsive:true});

  el.kpiNoBatFixed.textContent = "—";
  el.kpiNoBatDyn.textContent = "—";
  el.kpiWithBatFixed.textContent = "—";
  el.kpiWithBatDyn.textContent = "—";
  Plotly.newPlot("chart2", [], {}, {responsive:true});
  Plotly.newPlot("savingsChart", [], {}, {responsive:true});
  Plotly.newPlot("roiChart", [], {}, {responsive:true});
  Plotly.newPlot("powerChart", [], {}, {responsive:true});
  el.notes.textContent = "";
  el.sweepInfo.textContent = "";
  lastRecommended = null;
  el.applyRecommended.disabled = true;
  el.generatePdfBtn.disabled = false;
  setProgress(0, "");
  el.runSim.disabled = false;
  el.runSweep.disabled = false;
}
