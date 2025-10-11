import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WatchlistStock {
  id: string;
  symbol: string;
  currentPrice: number | null;
  company_name?: string;
}

interface WatchlistSectionProps {
  watchlist: WatchlistStock[];
  onRefresh: () => void;
  userRole?: string | null;
}

export const WatchlistSection = ({ watchlist, onRefresh, userRole }: WatchlistSectionProps) => {
  const { toast } = useToast();

  const handleDelete = async (id: string, symbol: string) => {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove stock from watchlist",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${symbol} removed from watchlist`,
      });
      onRefresh();
    }
  };

  if (watchlist.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchlist.map((stock) => (
              <TableRow key={stock.id}>
                <TableCell className="font-medium">{stock.symbol}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {stock.company_name || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {stock.currentPrice ? (
                    <div className="flex items-center justify-end gap-1">
                      <span>₹{stock.currentPrice.toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {userRole === 'wealth_manager' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(stock.id, stock.symbol)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
