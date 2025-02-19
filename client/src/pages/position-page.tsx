
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import type { SharePosition } from "@shared/schema";

export default function PositionPage() {
  const { data: positions } = useQuery<SharePosition[]>({
    queryKey: ["/api/share-positions"],
  });

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Positions Overview</h1>
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
    </div>
  );
}
