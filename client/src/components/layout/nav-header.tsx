import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2, LineChart, Settings, Users, BookOpen, BarChart2 } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

export function NavHeader() {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/">
            <h1 className="text-2xl font-bold cursor-pointer">Options Trading</h1>
          </Link>

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Trading</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-4 w-[400px]">
                    <Link href="/trade" className="block">
                      <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                        <LineChart className="h-5 w-5" />
                        <div>
                          <h3 className="font-medium">New Trade</h3>
                          <p className="text-sm text-muted-foreground">Enter new option or stock trades</p>
                        </div>
                      </div>
                    </Link>
                    <Link href="/positions" className="block">
                      <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                        <BarChart2 className="h-5 w-5" />
                        <div>
                          <h3 className="font-medium">Positions</h3>
                          <p className="text-sm text-muted-foreground">View and manage open positions</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Community</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-4 w-[400px]">
                    <Link href="/leaderboard" className="block">
                      <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                        <Users className="h-5 w-5" />
                        <div>
                          <h3 className="font-medium">Leaderboard</h3>
                          <p className="text-sm text-muted-foreground">See top performing traders</p>
                        </div>
                      </div>
                    </Link>
                    <Link href="/education" className="block">
                      <div className="flex items-center gap-2 p-2 hover:bg-accent rounded-md">
                        <BookOpen className="h-5 w-5" />
                        <div>
                          <h3 className="font-medium">Education</h3>
                          <p className="text-sm text-muted-foreground">Trading guides and resources</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-muted-foreground hidden md:inline">Welcome, {user?.username}</span>
          <Link href="/profile">
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Profile
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm"
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