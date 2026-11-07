/* Gráficos em canvas, sem bibliotecas (funcionam offline). */
(function (g) {
  "use strict";
  const GOLD = "#e4bd65", GREY = "#8f8a7e";
  const fm = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + " mi" : v >= 1e3 ? Math.round(v / 1e3) + " mil" : Math.round(v).toString();
  const full = (v, money) => money ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  function draw(cv, series, money, hover) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (!W) return;
    cv.width = W * dpr; cv.height = H * dpr;
    const x = cv.getContext("2d"); x.scale(dpr, dpr); x.clearRect(0, 0, W, H);
    const L = 46, R = 8, T = 8, B = 20, n = series[0].data.length;
    let max = 0; series.forEach(s => s.data.forEach(v => { if (v > max) max = v; })); max = max || 1;
    const X = i => L + (W - L - R) * i / (n - 1), Y = v => T + (H - T - B) * (1 - v / max);
    x.font = "10px system-ui"; x.fillStyle = GREY; x.strokeStyle = "#2a2a2c"; x.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const y = Y(max * k / 4); x.beginPath(); x.moveTo(L, y); x.lineTo(W - R, y); x.stroke(); x.textAlign = "right"; x.fillText(fm(max * k / 4), L - 4, y + 3); }
    x.textAlign = "center"; [1, 60, 120, 180, 240, 300, 360].forEach(m => x.fillText(m === 1 ? "mês 1" : m % 120 === 0 || m === 60 ? (m / 12) + "a" : "", X(m - 1), H - 5));
    series.forEach(s => { x.beginPath(); s.data.forEach((v, i) => i ? x.lineTo(X(i), Y(v)) : x.moveTo(X(i), Y(v))); x.strokeStyle = s.color; x.lineWidth = 2; x.stroke(); });
    if (hover != null) { x.strokeStyle = "#f2d184"; x.beginPath(); x.moveTo(X(hover), T); x.lineTo(X(hover), H - B); x.stroke(); series.forEach(s => { x.fillStyle = s.color; x.beginPath(); x.arc(X(hover), Y(s.data[hover]), 3.5, 0, 7); x.fill(); }); }
  }
  function bind(cv, series, money) {
    let tip = cv.parentNode.querySelector(".chart-tip");
    if (!tip) { tip = document.createElement("div"); tip.className = "chart-tip hidden"; cv.parentNode.appendChild(tip); }
    const move = e => {
      const r = cv.getBoundingClientRect(), n = series[0].data.length;
      const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - 46) / (r.width - 54) * (n - 1))));
      draw(cv, series, money, i); tip.classList.remove("hidden");
      tip.textContent = "Mês " + (i + 1) + " · " + series.map(s => s.name + ": " + full(s.data[i], money)).join(" · ");
    };
    cv.onpointermove = move; cv.onpointerdown = move;
    cv.onpointerleave = () => { tip.classList.add("hidden"); draw(cv, series, money); };
  }
  function update(rows, scenario) {
    const get = k => rows.map(r => r[k]);
    const set = [["chWealth", [{ name: "Patrimônio", data: get("nominalWealth"), color: GOLD }], true],
      ["chShares", [{ name: "Cotas", data: get("sharesAtEnd"), color: GOLD }], false],
      ["chIncome", [{ name: "Dividendos", data: get("monthlyIncome"), color: GOLD }], true],
      ["chReal", [{ name: "Nominal", data: get("nominalWealth"), color: GOLD }, { name: "Real", data: get("realWealth"), color: "#7fb7e8" }], true]];
    document.getElementById("chRealBox").classList.toggle("hidden", scenario === "nominal");
    set.forEach(([id, s, money]) => { const cv = document.getElementById(id); draw(cv, s, money); bind(cv, s, money); });
  }
  let last; g.addEventListener("resize", () => { if (last) update(last.r, last.s); });
  g.MXRFCharts = { update: (r, s) => { last = { r, s }; update(r, s); } };
})(window);
