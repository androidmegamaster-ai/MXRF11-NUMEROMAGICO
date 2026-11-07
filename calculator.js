/* Núcleo de cálculo: funções puras, sem dependência de interface. */
(function (global) {
  "use strict";
  function simulate(config) {
    const price = Number(config.price);
    const dividend = Number(config.dividend);
    const desiredShares = Math.ceil(Number(config.desiredShares));
    const inflation = Math.max(0, Number(config.inflation) || 0) / 100;
    const monthlyContribution = Math.max(0, Number(config.monthlyContribution) || 0);
    const stress = Math.min(90, Math.max(0, Number(config.stress) || 0)) / 100;
    const priceGrowth = (Number(config.priceGrowth) || 0) / 100, dividendGrowth = (Number(config.dividendGrowth) || 0) / 100;
    if (!(price > 0) || !(dividend > 0) || !(desiredShares > 0)) {
      throw new Error("Informe preço, dividendo e cotas desejadas válidos.");
    }
    const dividendEff = dividend * (1 - stress);
    const magicShares = Math.ceil((desiredShares * price / dividendEff) - 1e-10);
    const startShares = Math.floor(Number(config.initialShares)) > 0 ? Math.floor(Number(config.initialShares)) : magicShares;
    const initialInvestment = startShares * price;
    let shares = startShares;
    let carryC = 0;
    let totalPaid = initialInvestment;
    let previousRecord = 0;
    const rows = [];
    for (let month = 1; month <= 360; month++) {
      const year = Math.ceil(month / 12);
      const priceC = Math.round(price * Math.pow(1 + priceGrowth, year - 1) * 100);
      const dividendM = dividendEff * Math.pow(1 + dividendGrowth, year - 1);
      const inflationFactor = Math.pow(1 + inflation, month / 12);
      const contribC = config.scenario === "contributions" && month >= 2
        ? Math.round(monthlyContribution * Math.pow(1 + inflation, year - 1) * 100) : 0;
      const sharesAtStart = shares;
      const incomeC = Math.round(sharesAtStart * dividendM * 100);   // pagamento em centavos
      const availableC = incomeC + contribC + carryC;
      const purchasedShares = Math.floor(availableC / priceC);
      carryC = availableC - purchasedShares * priceC;
      shares += purchasedShares;
      const contribution = contribC / 100, monthlyIncome = incomeC / 100, remainder = carryC / 100, carry = remainder;
      totalPaid += contribution;
      const nominalWealth = (shares * priceC + carryC) / 100;
      const realIncome = monthlyIncome / inflationFactor;
      const realWealth = nominalWealth / inflationFactor;
      const isRecord = purchasedShares > previousRecord && purchasedShares > 0;
      if (isRecord) previousRecord = purchasedShares;
      rows.push({
        month, year, contribution, sharesAtStart, monthlyIncome, purchasedShares,
        remainder, carry, sharesAtEnd: shares, nominalWealth, realIncome,
        realWealth, totalPaid, inflationFactor, isRecord
      });
    }
    return { magicShares, startShares, initialInvestment, rows, totalPaid };
  }
  global.MXRFCalculator = { simulate };
})(typeof window !== "undefined" ? window : globalThis);
