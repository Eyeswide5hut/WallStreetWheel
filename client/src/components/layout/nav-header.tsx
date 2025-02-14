import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

export function NavHeader() {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold cursor-pointer">Trading Dashboard</h1>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">Welcome, {user?.username}</span>
          <Link href="/trade">
            <Button variant="outline">New Trade</Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="outline">Leaderboard</Button>
          </Link>
          <Link href="/profile">
            <Button variant="outline">Profile Settings</Button>
          </Link>
          <Button 
            variant="ghost" 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}