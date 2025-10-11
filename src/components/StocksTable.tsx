import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SellConfirmDialog } from "./SellConfirmDialog";

interface Stock {
  id: string;
  symbol: string;
  buying_price: number;
  purchase_date: string;
  quantity: number;
  currentPrice: number | null;
}

interface StocksTableProps {
  stocks: Stock[];
  calculateReturns: (stock: Stock) => { absolute: number; percentage: number };
  onDelete: () => void;
  userRole?: string | null;
}

type SortField = "symbol" | "quantity" | "buying_price" | "purchase_date" | "currentValue" | "returns";
type SortDirection = "asc" | "desc";

export const StocksTable = ({ stocks, calculateReturns, onDelete, userRole }: StocksTableProps) => {
  const [sortField, setSortField] = useState<SortField>("purchase_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const { toast } = useToast();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("stocks").delete().eq("id", id);

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

  const sortedStocks = [...stocks].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case "symbol":
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      case "quantity":
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case "buying_price":
        aValue = a.buying_price;
        bValue = b.buying_price;
        break;
      case "purchase_date":
        aValue = new Date(a.purchase_date).getTime();
        bValue = new Date(b.purchase_date).getTime();
        break;
      case "currentValue":
        aValue = (a.currentPrice || 0) * a.quantity;
        bValue = (b.currentPrice || 0) * b.quantity;
        break;
      case "returns":
        aValue = calculateReturns(a).absolute;
        bValue = calculateReturns(b).absolute;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc" 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-8 px-2 lg:px-3"
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton field="symbol">Symbol</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="quantity">Quantity</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="buying_price">Buy Price</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="purchase_date">Purchase Date</SortButton>
            </TableHead>
            <TableHead>Current Price</TableHead>
            <TableHead>
              <SortButton field="currentValue">Current Value</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="returns">Returns</SortButton>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStocks.map((stock) => {
            const returns = calculateReturns(stock);
            const invested = stock.buying_price * stock.quantity;
            const currentValue = (stock.currentPrice || 0) * stock.quantity;

            return (
              <TableRow key={stock.id}>
                <TableCell className="font-medium">{stock.symbol}</TableCell>
                <TableCell>{stock.quantity}</TableCell>
                <TableCell>₹{stock.buying_price.toFixed(2)}</TableCell>
                <TableCell>
                  {new Date(stock.purchase_date).toLocaleDateString("en-IN")}
                </TableCell>
                <TableCell>
                  {stock.currentPrice ? `₹${stock.currentPrice.toFixed(2)}` : "N/A"}
                </TableCell>
                <TableCell>₹{currentValue.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className={returns.absolute >= 0 ? "text-green-500" : "text-red-500"}>
                      ₹{returns.absolute.toFixed(2)}
                    </div>
                    <div className={`text-sm ${returns.percentage >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {returns.percentage >= 0 ? "+" : ""}{returns.percentage.toFixed(2)}%
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStock(stock);
                      setSellDialogOpen(true);
                    }}
                  >
                    Sell
                  </Button>
                  {userRole === 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(stock.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    
    {selectedStock && (
      <SellConfirmDialog
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
        stock={selectedStock}
      />
    )}
    </>
  );
};
