import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

export function TradeImporter() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => {
        const values = row.split(',');
        return {
          Type: values[0],
          Symbol: values[1],
          'Trade Date': values[2],
          Quantity: values[3],
          Price: values[4],
          Premium: values[5],
        };
      });

      // Remove header row and empty rows
      const trades = rows.slice(1).filter(row => row.Type && row.Symbol);

      await apiRequest('/api/trades/import', {
        method: 'POST',
        body: JSON.stringify(trades),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      toast({
        title: "Success",
        description: "Trade data imported successfully",
      });

      // Invalidate trades queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import trade data",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = ''; // Reset file input
      }
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Import Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            disabled={isUploading}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </>
            )}
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <p className="text-sm text-muted-foreground">
            Upload your TastyTrade transaction history CSV file
          </p>
        </div>
      </CardContent>
    </Card>
  );
}