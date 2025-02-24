import { useState } from "react";
import { NavHeader } from "@/components/layout/nav-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { OptionScannerData } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

type Greeks = {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
};

export default function OptionsScannerPage() {
  const [symbols, setSymbols] = useState<string>("");

  const { data: optionsData, isLoading } = useQuery<OptionScannerData[]>({
    queryKey: ['/api/options-scanner', symbols],
    enabled: symbols.length > 0
  });

  const handleSearch = () => {
    // This will trigger the query to refetch
    setSymbols(symbols.trim());
  };

  const formatGreeks = (greeks: Greeks) => {
    return (
      <div className="space-y-1">
        <p>Delta: {greeks.delta.toFixed(3)}</p>
        <p>Gamma: {greeks.gamma.toFixed(3)}</p>
        <p>Theta: {greeks.theta.toFixed(3)}</p>
        <p>Vega: {greeks.vega.toFixed(3)}</p>
        {greeks.rho && <p>Rho: {greeks.rho.toFixed(3)}</p>}
      </div>
    );
  };

  return (
    <div>
      <NavHeader />
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Options Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <Input
                placeholder="Enter stock symbols (e.g., AAPL, MSFT, GOOGL)"
                value={symbols}
                onChange={(e) => setSymbols(e.target.value)}
                className="max-w-xl"
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Strike</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>IV</TableHead>
                    <TableHead>ROC</TableHead>
                    <TableHead>Annual Return</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Greeks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : optionsData?.length ? (
                    optionsData.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell>
                          {new Date(option.expirationDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{option.symbol}</TableCell>
                        <TableCell>${option.strikePrice}</TableCell>
                        <TableCell>${option.currentPrice}</TableCell>
                        <TableCell>{option.priceDifference}%</TableCell>
                        <TableCell>${option.premium}</TableCell>
                        <TableCell>{option.impliedVolatility}%</TableCell>
                        <TableCell>{option.returnOnCapital}%</TableCell>
                        <TableCell>{option.annualReturn}%</TableCell>
                        <TableCell>{option.volume}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                View Greeks
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Option Greeks</DialogTitle>
                              </DialogHeader>
                              {formatGreeks(option.greeks as Greeks)}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center">
                        No options data available. Enter stock symbols to begin scanning.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}