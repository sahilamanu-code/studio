"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PendingItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

export function ImportClient() {
  const [pastedData, setPastedData] = useState("");
  const [, setPendingItems] = useLocalStorage<PendingItem[]>("pendingItems", []);
  const { toast } = useToast();

  const handleParseData = () => {
    const lines = pastedData.trim().split('\n');
    const newItems: PendingItem[] = [];
    let errors = 0;

    lines.forEach((line, index) => {
      const columns = line.split(/\t|,/); // Split by tab or comma
      if (columns.length >= 4) {
        const cleanerName = columns[0]?.trim();
        const site = columns[1]?.trim();
        const carPlate = columns[2]?.trim();
        const amount = parseFloat(columns[3]?.trim());

        if (cleanerName && site && carPlate && !isNaN(amount)) {
          newItems.push({
            id: `pending-${new Date().toISOString()}-${index}`,
            cleanerName,
            site,
            carPlate,
            amount,
            date: new Date().toISOString(), // Assume import date is today
          });
        } else {
            errors++;
        }
      } else {
        errors++;
      }
    });

    if (newItems.length > 0) {
      setPendingItems(prev => [...prev, ...newItems]);
      toast({
        title: "Import Successful",
        description: `${newItems.length} items imported. ${errors > 0 ? `${errors} lines had errors and were skipped.` : ''}`,
      });
      setPastedData("");
    } else {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "No valid data found. Please check the format and try again.",
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Import Pending List"
        description="Paste data from a CSV or Excel file to quickly add pending collections."
      />

      <Card>
        <CardHeader>
          <CardTitle>Paste Data</CardTitle>
          <CardDescription>
            Paste your data below. The app will attempt to parse it. <br/>
            Expected format: <code className="font-mono bg-muted p-1 rounded-sm text-sm">Cleaner Name, Site, Car Plate, Amount</code> per line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            placeholder="John Doe, Building A, P 12345, 150.50&#10;Jane Smith, Tower B, Q 67890, 200.00"
            rows={10}
            className="font-mono"
          />
          <Button onClick={handleParseData} disabled={!pastedData.trim()}>
            <Upload className="mr-2 h-4 w-4"/>
            Parse and Import Data
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
