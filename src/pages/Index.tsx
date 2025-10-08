import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AddStockDialog } from "@/components/AddStockDialog";
import { AddWatchlistDialog } from "@/components/AddWatchlistDialog";
import { WatchlistSection } from "@/components/WatchlistSection";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, RefreshCw } from "lucide-react";
import { calculateXIRR } from "@/utils/xirr";
import { useToast } from "@/hooks/use-toast";
import { StocksTable } from "@/components/StocksTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface WatchlistStock {
  id: string;
  symbol: string;
  currentPrice: number | null;
  company_name?: string;
}

const Index = () => {
  const [stocks, setStocks] = useState<StockWithPrice[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const { toast } = useToast();

  const checkLastUpdate = async () => {
    try {
      const { data, error } = await supabase
        .from("price_update_log")
        .select("*")
        .eq("status", "success")
        .order("update_time", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setLastUpdate(data.update_time);
      }
    } catch (err) {
      console.error("Error checking last update:", err);
    }
  };

  const fetchStocks = async () => {
    try {
      const { data: stocksData, error } = await supabase
        .from("stocks")
        .select("*")
        .order("purchase_date", { ascending: false });

      if (error) throw error;

      // Get latest prices from database
      const stocksWithPrices = await Promise.all(
        (stocksData || []).map(async (stock) => {
          try {
            // Try to get the latest price from stock_prices table
            const { data: priceData } = await supabase
              .from("stock_prices")
              .select("*")
              .eq("symbol", stock.symbol)
              .order("date", { ascending: false })
              .limit(1)
              .single();

            return { 
              ...stock, 
              currentPrice: priceData ? parseFloat(String(priceData.price)) : null 
            };
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

  const fetchWatchlist = async () => {
    try {
      const { data: watchlistData, error } = await supabase
        .from("watchlist")
        .select("*");

      if (error) throw error;

      // Get latest prices and company names
      const watchlistWithPrices = await Promise.all(
        (watchlistData || []).map(async (item) => {
          try {
            // Get price
            const { data: priceData } = await supabase
              .from("stock_prices")
              .select("*")
              .eq("symbol", item.symbol)
              .order("date", { ascending: false })
              .limit(1)
              .single();

            // Get company name
            const { data: symbolData } = await supabase
              .from("nse_symbols")
              .select("company_name")
              .eq("symbol", item.symbol)
              .single();

            return {
              ...item,
              currentPrice: priceData ? parseFloat(String(priceData.price)) : null,
              company_name: symbolData?.company_name,
            };
          } catch (err) {
            console.error(`Error fetching data for ${item.symbol}:`, err);
            return { ...item, currentPrice: null };
          }
        })
      );

      setWatchlist(watchlistWithPrices);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
    }
  };

  const handleDataRefresh = () => {
    fetchStocks();
    fetchWatchlist();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-stock-prices");
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${data.stocksUpdated} stock prices`,
      });

      await handleDataRefresh();
      await checkLastUpdate();
    } catch (error) {
      console.error("Error refreshing prices:", error);
      toast({
        title: "Error",
        description: "Failed to refresh stock prices",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    handleDataRefresh();
    checkLastUpdate();
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

  const isUpdateStale = () => {
    if (!lastUpdate) return false;
    const updateTime = new Date(lastUpdate);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - updateTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate > 24;
  };

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
              <AddStockDialog onStockAdded={handleDataRefresh} />
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
              <AddStockDialog onStockAdded={handleDataRefresh} />
            </div>
          ) : (
            <div className="space-y-4">
              {isUpdateStale() && lastUpdate && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Last successful price update was at {new Date(lastUpdate).toLocaleString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end mb-4">
                <Button 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Prices'}
                </Button>
              </div>
              <StocksTable 
                stocks={stocks} 
                calculateReturns={calculateReturns}
                onDelete={handleDataRefresh}
              />
              
              <WatchlistSection 
                watchlist={watchlist}
                onRefresh={fetchWatchlist}
              />
            </div>
          )}
          
          <AddWatchlistDialog onStockAdded={fetchWatchlist} />
        </div>
      </div>
    </AuthGuard>
  );
};

export default Index;
