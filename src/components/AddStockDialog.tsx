import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AddStockDialog = ({ onStockAdded }: { onStockAdded: () => void }) => {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add stocks",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("stocks").insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        buying_price: parseFloat(buyingPrice),
        purchase_date: purchaseDate,
        quantity: parseFloat(quantity),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Stock added successfully",
      });

      setOpen(false);
      setSymbol("");
      setBuyingPrice("");
      setPurchaseDate("");
      setQuantity("1");
      onStockAdded();
    } catch (error) {
      console.error("Error adding stock:", error);
      toast({
        title: "Error",
        description: "Failed to add stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">Stock Symbol (NSE)</Label>
            <Input
              id="symbol"
              placeholder="e.g., RELIANCE"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyingPrice">Buying Price (₹)</Label>
            <Input
              id="buyingPrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={buyingPrice}
              onChange={(e) => setBuyingPrice(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Stock"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
