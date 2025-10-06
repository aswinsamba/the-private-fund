interface CashFlow {
  amount: number;
  date: Date;
}

export const calculateXIRR = (cashFlows: CashFlow[]): number | null => {
  if (cashFlows.length < 2) return null;

  const guess = 0.1;
  const maxIterations = 100;
  const tolerance = 0.0001;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    const fx = cashFlows.reduce((sum, cf) => {
      const days = Math.floor((cf.date.getTime() - cashFlows[0].date.getTime()) / (1000 * 60 * 60 * 24));
      return sum + cf.amount / Math.pow(1 + rate, days / 365);
    }, 0);

    const dfx = cashFlows.reduce((sum, cf) => {
      const days = Math.floor((cf.date.getTime() - cashFlows[0].date.getTime()) / (1000 * 60 * 60 * 24));
      return sum - (cf.amount * days) / (365 * Math.pow(1 + rate, days / 365 + 1));
    }, 0);

    const newRate = rate - fx / dfx;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100;
    }

    rate = newRate;
  }

  return null;
};
