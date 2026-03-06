function renderSingleSimulation(){
  const cap = Math.max(0, Number(el.cap.value) || 0);
  const pmax = Math.max(0, Number(el.pmax.value) || 0);

  const r = runSimulationFor(cap, pmax);

  el.kpiNoBatFixed.textContent = euro(r.fixed0);
  el.kpiWithBatFixed.textContent = euro(r.fixed1);
  el.kpiNoBatDyn.textContent = r.dyn0Cost != null ? euro(r.dyn0Cost) : "—";
  el.kpiWithBatDyn.textContent = r.dyn1Cost != null ? euro(r.dyn1Cost) : "—";

  renderOutputGraph(r.timeline);

  el.notes.innerHTML = `
    <div class="small">
      Configuratie: <b>${cap} kWh</b> · <b>${pmax} kW</b><br>
      ${r.dynMissing ? `<span class="warn">Ontbrekende prijs-uren: ${r.dynMissing}</span>` : ""}
    </div>
  `;
}
