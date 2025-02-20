
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import type { SharePosition, Trade } from "@shared/schema";
import { NavHeader } from "@/components/layout/nav-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PositionPage() {
  const { data: positions } = useQuery<SharePosition[]>({
    queryKey: ["/api/share-positions"],
  });

  const { data: openTrades } = useQuery<Trade[]>({
    queryKey: ["/api/trades/open"],
  });

  const optionPositions = openTrades?.filter(trade => 
    trade.type === "covered_call" || 
    trade.type === "cash_secured_put" || 
    trade.type === "long_call" || 
    trade.type === "long_put"
  );

  return (
    <div>
      <NavHeader />
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Positions Overview</h1>
        
        <Tabs defaultValue="shares" className="space-y-4">
          <TabsList>
            <TabsTrigger value="shares">Shares</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="shares" className="space-y-4">
            {!positions?.length ? (
              <div className="text-center py-4 text-muted-foreground">
                No share positions found
              </div>
            ) : (
              <div className="grid gap-4">
                {positions?.map((position) => (
                  <Card key={position.id}>
                    <CardHeader>
                      <CardTitle>{position.symbol}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Quantity</p>
                          <p className="text-lg font-medium">{position.quantity}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Average Cost</p>
                          <p className="text-lg font-medium">
                            ${parseFloat(position.averageCost.toString()).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-lg font-medium">
                            ${(position.quantity * parseFloat(position.averageCost.toString())).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <ScrollArea className="h-[200px] mt-4">
                        <div className="space-y-2">
                          {position.acquisitionHistory?.map((event: any, index: number) => (
                            <div key={index} className="p-2 border rounded">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">
                                    {event.type === 'manual_entry' ? 'Added' : event.type} {Math.abs(event.quantity)} shares
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(event.date).toLocaleDateString()}
                                  </p>
                                </div>
                                <p className="font-mono">${event.price.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            {!optionPositions?.length ? (
              <div className="text-center py-4 text-muted-foreground">
                No option positions found
              </div>
            ) : (
              <div className="grid gap-4">
                {optionPositions?.map((trade) => (
                  <Card key={trade.id}>
                    <CardHeader>
                      <CardTitle>
                        {trade.underlyingAsset} {trade.optionType} ${trade.strikePrice}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="text-lg font-medium capitalize">{trade.type.replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Quantity</p>
                          <p className="text-lg font-medium">{trade.quantity}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Entry Price</p>
                          <p className="text-lg font-medium">${trade.entryPrice}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
