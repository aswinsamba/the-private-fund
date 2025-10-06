import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AddStockDialog } from "@/components/AddStockDialog";
import { StockCard } from "@/components/StockCard";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { calculateXIRR } from "@/utils/xirr";
import { useToast } from "@/hooks/use-toast";

interface Stock {
  id: string;
  symbol: string;
  buying_price: number;
  purchase_date: string;
  quantity: number;
}

interface StockWithPrice extends Stock {
  currentPrice: number | null;
}

const Index = () => {
  const [stocks, setStocks] = useState<StockWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStocks = async () => {
    try {
      const { data: stocksData, error } = await supabase
        .from("stocks")
        .select("*")
        .order("purchase_date", { ascending: false });

      if (error) throw error;

      const stocksWithPrices = await Promise.all(
        (stocksData || []).map(async (stock) => {
          try {
            const { data, error } = await supabase.functions.invoke("get-stock-price", {
              body: { symbol: stock.symbol },
            });

            if (error) {
              console.error(`Error fetching price for ${stock.symbol}:`, error);
              return { ...stock, currentPrice: null };
            }

            return { ...stock, currentPrice: data.price };
          } catch (err) {
            console.error(`Error fetching price for ${stock.symbol}:`, err);
            return { ...stock, currentPrice: null };
          }
        })
      );

      setStocks(stocksWithPrices);
    } catch (error) {
      console.error("Error fetching stocks:", error);
      toast({
        title: "Error",
        description: "Failed to fetch portfolio data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const calculateReturns = (stock: StockWithPrice) => {
    if (!stock.currentPrice) return { absolute: 0, percentage: 0 };

    const invested = stock.buying_price * stock.quantity;
    const current = stock.currentPrice * stock.quantity;
    const absolute = current - invested;
    const percentage = (absolute / invested) * 100;

    return { absolute, percentage };
  };

  const totalInvested = stocks.reduce(
    (sum, stock) => sum + stock.buying_price * stock.quantity,
    0
  );

  const currentValue = stocks.reduce(
    (sum, stock) => sum + (stock.currentPrice || 0) * stock.quantity,
    0
  );

  const totalReturns = currentValue - totalInvested;

  const xirr = (() => {
    const cashFlows = stocks.flatMap((stock) => [
      {
        amount: -(stock.buying_price * stock.quantity),
        date: new Date(stock.purchase_date),
      },
      {
        amount: (stock.currentPrice || 0) * stock.quantity,
        date: new Date(),
      },
    ]);

    return calculateXIRR(cashFlows);
  })();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                The Private Fund
              </h1>
              <p className="text-muted-foreground mt-2">Your Personal Stock Portfolio</p>
            </div>
            <div className="flex gap-3">
              <AddStockDialog onStockAdded={fetchStocks} />
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          <PortfolioSummary
            totalInvested={totalInvested}
            currentValue={currentValue}
            totalReturns={totalReturns}
            xirr={xirr}
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                No stocks in your portfolio yet
              </p>
              <AddStockDialog onStockAdded={fetchStocks} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocks.map((stock) => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  currentPrice={stock.currentPrice}
                  returns={calculateReturns(stock)}
                  onDelete={fetchStocks}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
