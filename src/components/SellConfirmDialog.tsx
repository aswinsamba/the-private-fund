import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SellConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stock: {
    id: string;
    symbol: string;
    quantity: number;
  };
}

export const SellConfirmDialog = ({ open, onOpenChange, stock }: SellConfirmDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const { error } = await supabase.functions.invoke("send-sell-request", {
        body: {
          stockId: stock.id,
          symbol: stock.symbol,
          quantity: stock.quantity,
          requestedByEmail: user.email,
        },
      });

      if (error) throw error;

      toast({
        title: "Sell Request Sent",
        description: "Aswin has been notified of your sell request.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error sending sell request:", error);
      toast({
        title: "Error",
        description: "Failed to send sell request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Stock Sale</DialogTitle>
          <DialogDescription>
            This will notify Aswin that you want to sell {stock.quantity} shares of {stock.symbol}.
            Do you want to proceed?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
