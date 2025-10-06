import { Card } from "./ui/card";
import { TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";

interface PortfolioSummaryProps {
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  xirr: number | null;
}

export const PortfolioSummary = ({
  totalInvested,
  currentValue,
  totalReturns,
  xirr,
}: PortfolioSummaryProps) => {
  const isPositive = totalReturns >= 0;
  const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Total Invested</p>
        </div>
        <p className="text-2xl font-bold">₹{totalInvested.toFixed(2)}</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">Current Value</p>
        </div>
        <p className="text-2xl font-bold">₹{currentValue.toFixed(2)}</p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-2">
          {isPositive ? (
            <TrendingUp className="h-5 w-5 text-accent" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
          <p className="text-sm text-muted-foreground">Total Returns</p>
        </div>
        <p className={`text-2xl font-bold ${isPositive ? "text-accent" : "text-destructive"}`}>
          {isPositive ? "+" : ""}₹{totalReturns.toFixed(2)}
        </p>
        <p className={`text-sm ${isPositive ? "text-accent" : "text-destructive"}`}>
          {returnsPercentage.toFixed(2)}%
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <p className="text-sm text-muted-foreground">XIRR</p>
        </div>
        <p className="text-2xl font-bold">
          {xirr !== null ? `${xirr.toFixed(2)}%` : "Calculating..."}
        </p>
      </Card>
    </div>
  );
};
