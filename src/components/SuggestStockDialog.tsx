import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";

export const SuggestStockDialog = () => {
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!suggestion.trim()) {
      toast({
        title: "Error",
        description: "Please enter a suggestion.",
        variant: "destructive",
      });
      return;
    }

    if (suggestion.length > 1000) {
      toast({
        title: "Error",
        description: "Suggestion must be less than 1000 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const { error } = await supabase.functions.invoke("send-suggestion", {
        body: {
          suggestionText: suggestion,
          suggestedByEmail: user.email,
        },
      });

      if (error) throw error;

      toast({
        title: "Suggestion Sent",
        description: "Your stock suggestion has been sent to Aswin.",
      });

      setSuggestion("");
      setOpen(false);
    } catch (error) {
      console.error("Error sending suggestion:", error);
      toast({
        title: "Error",
        description: "Failed to send suggestion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Suggest New Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a New Stock</DialogTitle>
          <DialogDescription>
            Share your stock recommendation with Aswin. Include the stock symbol, reasons for
            investing, and any relevant analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Enter your stock suggestion here (max 1000 characters)..."
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            maxLength={1000}
            rows={6}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground text-right">
            {suggestion.length}/1000 characters
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Suggestion"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
