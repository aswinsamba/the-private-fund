import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AddWatchlistDialogProps {
  onStockAdded: () => void;
}

interface NseSymbol {
  symbol: string;
  company_name: string;
}

export const AddWatchlistDialog = ({ onStockAdded }: AddWatchlistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<NseSymbol | null>(null);
  const [nseSymbols, setNseSymbols] = useState<NseSymbol[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.length > 1) {
      fetchSymbols(searchQuery);
    }
  }, [searchQuery]);

  const fetchSymbols = async (query: string) => {
    const { data, error } = await supabase
      .from('nse_symbols')
      .select('symbol, company_name')
      .or(`symbol.ilike.%${query}%,company_name.ilike.%${query}%`)
      .limit(20);

    if (!error && data) {
      setNseSymbols(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSymbol) {
      toast({
        title: "Error",
        description: "Please select a stock symbol",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add to watchlist",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('watchlist')
      .insert({
        user_id: user.id,
        symbol: selectedSymbol.symbol,
      });

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: "Already in watchlist",
          description: "This stock is already in your watchlist",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add stock to watchlist",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Success",
        description: "Stock added to watchlist",
      });
      setSelectedSymbol(null);
      setSearchQuery("");
      setOpen(false);
      onStockAdded();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedSymbol 
                    ? `${selectedSymbol.symbol} - ${selectedSymbol.company_name}`
                    : "Search for a stock..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No stocks found.</CommandEmpty>
                    <CommandGroup>
                      {nseSymbols.map((stock) => (
                        <CommandItem
                          key={stock.symbol}
                          value={stock.symbol}
                          onSelect={() => {
                            setSelectedSymbol(stock);
                            setComboboxOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{stock.symbol}</span>
                            <span className="text-sm text-muted-foreground">{stock.company_name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !selectedSymbol}>
            {loading ? "Adding..." : "Add to Watchlist"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
