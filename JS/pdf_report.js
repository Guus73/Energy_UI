function fillPdfReport() {
  document.getElementById("reportPeriod").textContent =
    `${el.from.value || "—"} → ${el.to.value || "—"}`;

  document.getElementById("reportMode").textContent =
    el.batMode.value === "self" ? "Zelfconsumptie" : "Dynamisch arbitrage";

  document.getElementById("reportPriorityExport").textContent =
    el.priorityExport.checked ? "Ja" : "Nee";

  document.getElementById("reportForecast").textContent =
    el.optForecast.checked ? "Ja" : "Nee";

  document.getElementById("reportFixedNoBat").textContent =
    el.kpiNoBatFixed.textContent || "—";

  document.getElementById("reportFixedBat").textContent =
    el.kpiWithBatFixed.textContent || "—";

  document.getElementById("reportDynNoBat").textContent =
    el.kpiNoBatDyn.textContent || "—";

  document.getElementById("reportDynBat").textContent =
    el.kpiWithBatDyn.textContent || "—";

  if (lastRecommended) {
    document.getElementById("reportRecCap").textContent = `${lastRecommended.cap} kWh`;
    document.getElementById("reportRecPower").textContent = `${lastRecommended.pmax} kW`;
    document.getElementById("reportRecCost").textContent = euro(batteryCostEUR(lastRecommended.cap));
    document.getElementById("reportRecRoiFix").textContent =
      lastRecommended.fix?.roi != null ? `${lastRecommended.fix.roi.toFixed(1)} years` : "—";
    document.getElementById("reportRecRoiDyn").textContent =
      lastRecommended.dyn?.roi != null ? `${lastRecommended.dyn.roi.toFixed(1)} years` : "—";
  } else {
    document.getElementById("reportRecCap").textContent = "—";
    document.getElementById("reportRecPower").textContent = "—";
    document.getElementById("reportRecCost").textContent = "—";
    document.getElementById("reportRecRoiFix").textContent = "—";
    document.getElementById("reportRecRoiDyn").textContent = "—";
  }

  document.getElementById("reportNotes").innerHTML =
    el.notes.innerHTML || "—";
}

function generatePdfReport() {
  fillPdfReport();

  const report = document.getElementById("pdfReport");
  const app = document.querySelector(".wrap");
  const header = document.querySelector("header");

  // Make report visible before calling print
  report.style.display = "block";
  app.style.display = "none";
  header.style.display = "none";

  setTimeout(() => {
    window.print();

    // Restore UI after print dialog closes or is dismissed
    setTimeout(() => {
      report.style.display = "none";
      app.style.display = "";
      header.style.display = "";
    }, 500);
  }, 100);
}

