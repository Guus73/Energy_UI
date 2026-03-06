function renderOutputGraph(timeline){
  const agg = el.agg.value;
  const tl = aggregateSeries(timeline, agg);

  Plotly.newPlot("chart2", [
    {
      x: tl.map(p => new Date(p.t)),
      y: tl.map(p => p.import0 ?? 0),
      type: "scatter",
      mode: "lines",
      name: "Import vóór"
    },
    {
      x: tl.map(p => new Date(p.t)),
      y: tl.map(p => p.import1 ?? 0),
      type: "scatter",
      mode: "lines",
      name: "Import na"
    },
    {
      x: tl.map(p => new Date(p.t)),
      y: tl.map(p => p.export0 ?? 0),
      type: "scatter",
      mode: "lines",
      name: "Export vóór"
    },
    {
      x: tl.map(p => new Date(p.t)),
      y: tl.map(p => p.export1 ?? 0),
      type: "scatter",
      mode: "lines",
      name: "Export na"
    },
    {
      x: tl.map(p => new Date(p.t)),
      y: tl.map(p => p.soc ?? 0),
      type: "scatter",
      mode: "lines",
      name: "SoC"
    }
  ], {
    margin: { t: 10, r: 10, b: 40, l: 55 },
    xaxis: { title: "Tijd" },
    yaxis: {
      title: "Import / Export / SoC",
      zeroline: true,
      zerolinewidth: 2
    },
    hovermode: "x unified",
    legend: { orientation: "h" }
  }, { responsive: true });
}
