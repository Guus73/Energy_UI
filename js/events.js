el.consFile.addEventListener("change", () => {
  const f = el.consFile.files?.[0];
  if (!f) return;

  consRows = [];
  consCols = [];
  hourlyAllCache = null;

  Papa.parse(f, {
    header:true,
    skipEmptyLines:true,
    complete:(res)=>{
      consRows = res.data || [];
      consCols = res.meta.fields || Object.keys(consRows[0]||{});
      if (!consCols.length){
        alert("Geen kolommen gevonden in CSV.");
        return;
      }

      fillSelect(el.colDate, consCols, consCols.includes("Datum") ? "Datum" : consCols[0]);
      fillSelect(el.colValue, consCols, consCols.includes("Verbruik") ? "Verbruik" : (consCols[1]||consCols[0]));
      fillSelect(el.colType, consCols, consCols.includes("Type") ? "Type" : (consCols[2]||consCols[0]));
      fillSelect(el.colTariff, consCols, consCols.includes("Tarief") ? "Tarief" : (consCols[3]||consCols[0]));

      const hasEAN = consCols.includes("EAN");
      const eans = hasEAN
        ? Array.from(new Set(consRows.map(r => r["EAN"]).filter(v=>v!=null).map(v=>String(v)))).sort()
        : [];
      el.ean.innerHTML = `<option value="">(alle)</option>` + eans.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
      if (!hasEAN) el.ean.innerHTML = `<option value="">(geen EAN kolom)</option>`;

      el.from.value = "";
      el.to.value = "";
      render();
    }
  });
});

["colDate","colValue","colType","colTariff","tz","agg","from","to","series","ean","bzn"].forEach(id => {
  el[id].addEventListener("change", () => {
    hourlyAllCache = null;
    updatePriceUrl();
    render();
  });
});

el.copyUrl.addEventListener("click", async () => {
  const url = buildEnergyChartsUrl();
  if (!url){
    alert("Kies eerst Van/Tot.");
    return;
  }
  try{
    await navigator.clipboard.writeText(url);
    setPriceInfo("Link gekopieerd ✅", "ok");
  } catch {
    prompt("Copy this URL:", url);
  }
});

el.priceFile.addEventListener("change", async () => {
  const f = el.priceFile.files?.[0];
  if (!f) return;

  try{
    const { map, unit, scale } = await loadEnergyChartsJson(f);
    dynPrices = map;

    const all = buildHourlyAll();
    const hours = all.filter(p=>inRange(p.t));
    let have = 0;
    for (const p of hours){
      if (priceAtHourStart(p.t) != null) have++;
    }

    setPriceInfo(`Prijsbestand geladen ✅ ${dynPrices.size} uurprijzen. Unit: ${unit || "(onbekend)"}; schaal: ${scale}. Dekking: ${have}/${hours.length} uur.`, "ok");
  } catch(e){
    dynPrices = null;
    setPriceInfo(`Prijsbestand fout: ${e.message}`, "bad");
  }
});

el.runSim.addEventListener("click", () => {
  if (!consRows.length){
    alert("Upload eerst een verbruik CSV.");
    return;
  }
  if (el.optForecast.checked && !dynPrices){
    alert("Forecast optimisation vereist een prijs JSON.");
    return;
  }
  renderSingleSimulation();
});

el.runSweep.addEventListener("click", async () => {
  if (!consRows.length){
    alert("Upload eerst een verbruik CSV.");
    return;
  }
  await runSweepAndRecommend();
});

el.applyRecommended.addEventListener("click", () => {
  if (!lastRecommended) return;
  el.cap.value = lastRecommended.cap;
  el.pmax.value = lastRecommended.pmax;
  renderSingleSimulation();
});

el.generatePdfBtn.addEventListener("click", generatePdfReport);



// init
updatePriceUrl();
setProgress(0, "");
