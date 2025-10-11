import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
}

interface UserSelectorProps {
  onUserSelect: (userId: string) => void;
  selectedUserId: string | null;
}

export const UserSelector = ({ onUserSelect, selectedUserId }: UserSelectorProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwners = async () => {
      setLoading(true);
      console.log("Fetching owners for user selector...");
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(email)")
        .eq("role", "owner");

      console.log("User selector query result:", { data, error });

      if (!error && data) {
        const owners = data.map((item: any) => ({
          id: item.user_id,
          email: item.profiles.email,
        }));
        console.log("Mapped owners:", owners);
        setUsers(owners);
        
        // Auto-select first user if none selected
        if (owners.length > 0 && !selectedUserId) {
          onUserSelect(owners[0].id);
        }
      } else if (error) {
        console.error("Error fetching owners:", error);
      }
      
      setLoading(false);
    };

    fetchOwners();
  }, []);

  if (loading) {
    return (
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Select User</label>
        <div className="flex items-center gap-2">
          <div className="h-10 w-full max-w-xs bg-muted animate-pulse rounded-md"></div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Select User</label>
        <div className="text-sm text-muted-foreground">No users available</div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="text-sm font-medium mb-2 block">Select User</label>
      <Select value={selectedUserId || ""} onValueChange={onUserSelect}>
        <SelectTrigger className="w-full max-w-xs bg-background">
          <SelectValue placeholder="Select a user to view" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
