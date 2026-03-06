function euro(x){ return Number.isFinite(x) ? new Intl.NumberFormat(undefined,{style:"currency",currency:"EUR"}).format(x) : "—"; }
function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])); }
function fillSelect(sel, options, preferred){
  sel.innerHTML = options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
  if (preferred && options.includes(preferred)) sel.value = preferred;
}
function setProgress(pct, text=""){
  el.progressBar.style.width = `${clamp(pct,0,100)}%`;
  el.progressText.textContent = text || `${Math.round(clamp(pct,0,100))}%`;
}
function yieldToUI(){ return new Promise(resolve => setTimeout(resolve, 0)); }
