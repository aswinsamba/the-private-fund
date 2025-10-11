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

  useEffect(() => {
    const fetchOwners = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(email)")
        .eq("role", "owner");

      if (!error && data) {
        const owners = data.map((item: any) => ({
          id: item.user_id,
          email: item.profiles.email,
        }));
        setUsers(owners);
        
        // Auto-select first user if none selected
        if (owners.length > 0 && !selectedUserId) {
          onUserSelect(owners[0].id);
        }
      }
    };

    fetchOwners();
  }, []);

  return (
    <div className="mb-6">
      <label className="text-sm font-medium mb-2 block">Select User</label>
      <Select value={selectedUserId || ""} onValueChange={onUserSelect}>
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Select a user to view" />
        </SelectTrigger>
        <SelectContent>
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
