function batteryCostEUR(cap){
  const t1 = Math.max(0, Number(el.tier1.value) || 0);
  const t2 = Math.max(0, Number(el.tier2.value) || 0);
  const t3 = Math.max(0, Number(el.tier3.value) || 0);
  const fixed = Math.max(0, Number(el.batFixedCost.value) || 0);

  let cost = 0;
  cost += Math.min(cap, 5) * t1;
  cost += Math.min(Math.max(cap - 5, 0), 10) * t2;
  cost += Math.max(cap - 15, 0) * t3;
  return cost + fixed;
}
