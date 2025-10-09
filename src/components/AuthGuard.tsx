import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const checkAuthorization = async (email: string) => {
    const { data, error } = await supabase
      .from("authorized_users")
      .select("email")
      .eq("email", email)
      .single();

    return !error && data;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user?.email) {
          setTimeout(() => {
            checkAuthorization(session.user.email!).then(authorized => {
              setIsAuthorized(!!authorized);
              setLoading(false);
            });
          }, 0);
        } else {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        checkAuthorization(session.user.email).then(authorized => {
          setIsAuthorized(!!authorized);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const redirectUrl = `${window.location.origin}/`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6 p-8 rounded-lg bg-card max-w-md">
          <h1 className="text-3xl font-bold text-foreground">The Private Fund</h1>
          <p className="text-muted-foreground">Please sign in to access your portfolio</p>
          <Button onClick={handleGoogleSignIn} size="lg" className="w-full">
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6 p-8 rounded-lg bg-card max-w-md">
          <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">
            Access for this ID is not supported. Only authorized users can access The Private Fund.
          </p>
          <Button 
            onClick={() => supabase.auth.signOut()} 
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
