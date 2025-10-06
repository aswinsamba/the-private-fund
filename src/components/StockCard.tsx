import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StockCardProps {
  stock: {
    id: string;
    symbol: string;
    buying_price: number;
    purchase_date: string;
    quantity: number;
  };
  currentPrice: number | null;
  returns: {
    absolute: number;
    percentage: number;
  };
  onDelete: () => void;
}

export const StockCard = ({ stock, currentPrice, returns, onDelete }: StockCardProps) => {
  const { toast } = useToast();
  const isPositive = returns.absolute >= 0;

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("stocks").delete().eq("id", stock.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Stock removed from portfolio",
      });

      onDelete();
    } catch (error) {
      console.error("Error deleting stock:", error);
      toast({
        title: "Error",
        description: "Failed to delete stock",
        variant: "destructive",
      });
    }
  };

  const totalInvested = stock.buying_price * stock.quantity;
  const currentValue = currentPrice ? currentPrice * stock.quantity : 0;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">{stock.symbol}</h3>
          <p className="text-sm text-muted-foreground">
            {new Date(stock.purchase_date).toLocaleDateString()}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Quantity</p>
          <p className="text-lg font-semibold">{stock.quantity}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg Price</p>
          <p className="text-lg font-semibold">₹{stock.buying_price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-lg font-semibold">
            {currentPrice ? `₹${currentPrice.toFixed(2)}` : "Loading..."}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Invested</p>
          <p className="text-lg font-semibold">₹{totalInvested.toFixed(2)}</p>
        </div>
      </div>

      {currentPrice && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-accent" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className={isPositive ? "text-accent" : "text-destructive"}>
                {returns.percentage.toFixed(2)}%
              </span>
            </div>
            <div className={`text-lg font-bold ${isPositive ? "text-accent" : "text-destructive"}`}>
              {isPositive ? "+" : ""}₹{returns.absolute.toFixed(2)}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Current Value: ₹{currentValue.toFixed(2)}
          </p>
        </div>
      )}
    </Card>
  );
};
