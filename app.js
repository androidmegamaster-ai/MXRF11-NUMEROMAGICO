(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const money = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const integer = (v) => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const decimal = (v) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateTime = (iso) => {
    if (!iso) return "Data de atualização não informada";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) + " (Brasília)";
  };
  let scenario = "nominal";
  let latestRows = [];
  let latestSimulation = null;
  let lastMarketData = null;

  const inputIds = ["price", "dividend", "desiredShares", "incomeGoal", "inflation", "monthlyContribution"];
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("mxrf11-settings") || "{}");
      inputIds.forEach((id) => { if (saved[id] !== undefined && $(id)) $(id).value = saved[id]; });
    } catch (_) {}
  }
  function saveSettings() {
    const values = {};
    inputIds.forEach((id) => { if ($(id)) values[id] = $(id).value; });
    try { localStorage.setItem("mxrf11-settings", JSON.stringify(values)); } catch (_) {}
  }
  function config() {
    return {
      scenario, price: Number($("price").value), dividend: Number($("dividend").value),
      desiredShares: Number($("desiredShares").value), inflation: Number($("inflation").value),
      monthlyContribution: Number($("monthlyContribution").value)
    };
  }
  function render() {
    const c = config();
    let result;
    try { result = MXRFCalculator.simulate(c); }
    catch (e) {
      $("goalMessage").textContent = e.message;
      $("summaryCards").innerHTML = "";
      $("simulationTable").querySelector("tbody").innerHTML = "";
      return;
    }
    latestSimulation = result;
    latestRows = result.rows;
    $("magicShares").textContent = integer(result.magicShares) + " cotas";
    $("initialInvestment").textContent = money(result.initialInvestment);
    const goal = Math.max(0, Number($("incomeGoal").value) || 0);
    const realGoal = scenario !== "nominal";
    const targetIndex = result.rows.findIndex((r) => (realGoal ? r.realIncome : r.monthlyIncome) >= goal && goal > 0);
    if (goal <= 0) {
      $("goalMessage").textContent = "Digite uma meta de renda mensal acima de zero.";
      $("goalDetail").textContent = "";
    } else if (targetIndex < 0) {
      $("goalMessage").textContent = "Você não atinge " + money(goal) + " por mês em 360 meses.";
      $("goalDetail").textContent = realGoal ? "A meta é comparada ao rendimento real, descontada a inflação." : "A meta é comparada ao rendimento nominal.";
    } else {
      const month = targetIndex + 1;
      $("goalMessage").textContent = "Você atinge " + money(goal) + " por mês no mês " + month + " (" + Math.floor(month / 12) + " anos e " + (month % 12) + " meses).";
      $("goalDetail").textContent = "Meta calculada pelo " + (realGoal ? "rendimento real, em poder de compra de hoje." : "rendimento nominal do mês.");
    }
    const lastRow = result.rows[359], cur = realGoal ? lastRow.realIncome : lastRow.monthlyIncome;
    const pct = goal > 0 ? Math.min(100, cur / goal * 100) : 0;
    $("goalBar").style.width = pct.toFixed(1) + "%";
    if (goal > 0) $("goalDetail").textContent += " Progresso no mês 360: " + decimal(pct) + "% da meta.";
    renderCards(result, c);
    if (window.MXRFCharts) MXRFCharts.update(result.rows, scenario);
    renderTable(result, c, targetIndex + 1);
    saveSettings();
  }
  function renderCards(result, c) {
    const last = result.rows[359];
    let cards = [];
    if (scenario === "nominal") {
      cards = [
        ["Você coloca (1 vez)", money(result.initialInvestment)],
        ["Cotas no início", integer(result.magicShares)],
        ["Cotas no mês 360", integer(last.sharesAtEnd)],
        ["Renda no mês 360", money(last.sharesAtEnd * c.dividend)],
        ["Patrimônio no mês 360", money(last.nominalWealth)],
        ["Quantas vezes multiplicou", decimal(last.nominalWealth / result.initialInvestment) + "×"]
      ];
    } else if (scenario === "inflation") {
      cards = [
        ["Você coloca (1 vez)", money(result.initialInvestment)],
        ["Cotas no início", integer(result.magicShares)],
        ["Cotas no mês 360", integer(last.sharesAtEnd)],
        ["Renda nominal", money(last.sharesAtEnd * c.dividend)],
        ["Renda real", money(last.realIncome)],
        ["Patrimônio nominal", money(last.nominalWealth)],
        ["Patrimônio real (R$ de hoje)", money(last.realWealth)],
        ["Quantas vezes multiplicou", decimal(last.nominalWealth / result.initialInvestment) + "×"]
      ];
    } else {
      cards = [
        ["Total que saiu do bolso", money(last.totalPaid)],
        ["Cotas no mês 360", integer(last.sharesAtEnd)],
        ["Renda mensal nominal", money(last.sharesAtEnd * c.dividend)],
        ["Renda mensal real", money(last.realIncome)],
        ["Patrimônio nominal", money(last.nominalWealth)],
        ["Patrimônio real (R$ de hoje)", money(last.realWealth)]
      ];
    }
    const year30 = result.rows.slice(348).reduce((t, r) => t + r.monthlyIncome, 0);
    cards.unshift(["Número mágico", integer(result.magicShares) + " cotas"]);
    cards.push(["Dividendos anuais (ano 30)", money(year30)], ["Saldo financeiro restante", money(last.remainder)],
      ["Total em aportes", money(last.totalPaid - result.initialInvestment)]);
    $("summaryCards").innerHTML = cards.map(([label, value]) =>
      '<article class="summary-card"><p>' + label + '</p><strong>' + value + '</strong></article>'
    ).join("");
  }
  function renderTable(result, c, goalMonth) {
    const headers = ["Ano", "Mês"];
    if (scenario === "contributions") headers.push("Aporte do mês");
    headers.push("Quantas cotas eu tenho", "Valor da cota", "Rendimento do mês", "Quantas cotas eu compro", "Sobra (rebarba)", "Patrimônio total");
    if (scenario !== "nominal") headers.push("Rendimento real", "Patrimônio real (R$ de hoje)");
    $("simulationTable").querySelector("thead").innerHTML = "<tr>" + headers.map(h => "<th>" + h + "</th>").join("") + "</tr>";
    $("simulationTable").querySelector("tbody").innerHTML = result.rows.map((r) => {
      const cells = [r.month % 12 === 1 ? "Ano " + r.year : "", r.month];
      if (scenario === "contributions") cells.push(money(r.contribution));
      cells.push(integer(r.sharesAtStart), money(c.price), money(r.monthlyIncome), integer(r.purchasedShares), money(r.remainder), money(r.nominalWealth));
      if (scenario !== "nominal") cells.push(money(r.realIncome), money(r.realWealth));
      const classes = [(r.year % 2 ? "year-odd" : "year-even"), (r.isRecord ? "record" : ""), (goalMonth === r.month ? "goal" : "")].filter(Boolean).join(" ");
      return '<tr class="' + classes + '">' + cells.map(v => "<td>" + v + "</td>").join("") + "</tr>";
    }).join("");
  }
  function setScenario(next) {
    scenario = next;
    document.querySelectorAll(".tab").forEach((button) => {
      const active = button.dataset.tab === scenario;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $("inflationFields").classList.toggle("hidden", scenario === "nominal");
    $("contributionFields").classList.toggle("hidden", scenario !== "contributions");
    render();
  }
  function downloadCsv() {
    if (!latestRows.length) return;
    const c = config();
    const headers = ["Ano", "Mês"];
    if (scenario === "contributions") headers.push("Aporte do mês");
    headers.push("Cotas no início", "Preço da cota", "Rendimento do mês", "Cotas compradas", "Sobra", "Cotas no fim", "Patrimônio total");
    if (scenario !== "nominal") headers.push("Rendimento real", "Patrimônio real");
    const lines = [headers];
    latestRows.forEach(r => {
      const row = [r.year, r.month];
      if (scenario === "contributions") row.push(r.contribution);
      row.push(r.sharesAtStart, c.price, r.monthlyIncome, r.purchasedShares, r.remainder, r.sharesAtEnd, r.nominalWealth);
      if (scenario !== "nominal") row.push(r.realIncome, r.realWealth);
      lines.push(row);
    });
    const content = "\uFEFF" + lines.map(row => row.map(value => {
      if (typeof value === "number") return value.toFixed(2).replace(".", ",");
      return String(value).replace(/"/g, '""');
    }).join(";")).join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "MXRF11-" + scenario + "-360-meses.csv";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }
  async function refreshData() {
    const button = $("refreshData");
    button.disabled = true; button.textContent = "Consultando...";
    try {
      const response = await fetch("./data.json?ts=" + Date.now(), { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível consultar os dados publicados.");
      const data = await response.json();
      if (data.price > 0 && data.dividend > 0) {
        lastMarketData = data;
        try { localStorage.removeItem("mxrf11-manual"); } catch (_) {}
        $("price").value = Number(data.price).toFixed(2);
        $("dividend").value = Number(data.dividend).toFixed(3);
        $("dataStatus").textContent = "Dados publicados em " + dateTime(data.updatedAt) + (data.source ? " · Fonte: " + data.source : "");
        render();
      } else throw new Error("O arquivo de dados não contém valores válidos.");
    } catch (error) {
      $("dataStatus").textContent = "Não foi possível atualizar: " + error.message + " Seus valores editados foram preservados.";
    } finally {
      button.disabled = false; button.textContent = "↻ Atualizar dados";
    }
  }
  inputIds.forEach(id => $(id).addEventListener("input", () => {
    if (id === "price" || id === "dividend") { try { localStorage.setItem("mxrf11-manual", "1"); } catch (_) {} }
    render();
  }));
  document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => setScenario(button.dataset.tab)));
  $("downloadCsv").addEventListener("click", downloadCsv);
  $("refreshData").addEventListener("click", refreshData);
  loadSettings();
  render();
  fetch("./data.json", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => {
    if (data && data.price > 0 && data.dividend > 0) {
      lastMarketData = data;
      let manual = false; try { manual = !!localStorage.getItem("mxrf11-manual"); } catch (_) {}
      if (!manual) { $("price").value = Number(data.price).toFixed(2); $("dividend").value = Number(data.dividend).toFixed(3); render(); }
      $("dataStatus").textContent = (manual ? "Valores editados por você · publicados: " : "Dados publicados: ") + dateTime(data.updatedAt) + (data.source ? " · Fonte: " + data.source : "");
    }
  }).catch(() => {});
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
})();
