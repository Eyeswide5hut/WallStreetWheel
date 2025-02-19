
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EducationPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Trading Education</h1>
      <Tabs defaultValue="basics">
        <TabsList>
          <TabsTrigger value="basics">Trading Basics</TabsTrigger>
          <TabsTrigger value="options">Options Trading</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basics">
          <Card>
            <CardHeader>
              <CardTitle>Trading Fundamentals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-xl font-semibold">Getting Started</h3>
              <p>Learn the basics of trading, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Market orders vs limit orders</li>
                <li>Understanding bid-ask spreads</li>
                <li>Reading stock charts</li>
                <li>Basic technical analysis</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options">
          <Card>
            <CardHeader>
              <CardTitle>Options Trading Strategies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-xl font-semibold">Options Basics</h3>
              <p>Key concepts in options trading:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Calls and Puts explained</li>
                <li>Strike prices and expiration dates</li>
                <li>The Greeks (Delta, Theta, etc.)</li>
                <li>Basic options strategies</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-xl font-semibold">Managing Risk</h3>
              <p>Essential risk management principles:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Position sizing</li>
                <li>Stop loss strategies</li>
                <li>Portfolio diversification</li>
                <li>Risk/reward ratios</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
