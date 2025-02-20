import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import TradeEntry from "@/pages/trade-entry";
import ProfileSettings from "@/pages/profile-settings";
import LeaderboardPage from "@/pages/leaderboard-page";
import TraderDashboard from "@/pages/trader-dashboard";
import PositionPage from "./pages/position-page";
import EducationPage from "./pages/education-page";
import { ProtectedRoute } from "./lib/protected-route";
import './index.css'
import { ThemeProvider } from "@/components/theme-provider"
import LatestTradesPage from "./pages/latest-trades";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/trade" component={TradeEntry} />
      <ProtectedRoute path="/profile" component={ProfileSettings} />
      <ProtectedRoute path="/leaderboard" component={LeaderboardPage} />
      <ProtectedRoute path="/traders/:id" component={TraderDashboard} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/positions" component={PositionPage} />
      <Route path="/education" component={EducationPage} />
      <Route path="/latest-trades" component={LatestTradesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router />
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;