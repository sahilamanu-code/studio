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

    // Remove header and identify column indices
    const headerLine = lines.shift()?.toLowerCase();
    if (!headerLine) {
        toast({
            variant: "destructive",
            title: "Import Failed",
            description: "Pasted data is empty.",
        });
        return;
    }
    const headers = headerLine.split(/\t|,/).map(h => h.trim());

    const plateIndex = headers.findIndex(h => h.includes('plate'));
    const amountIndex = headers.findIndex(h => h.includes('contract amount cash'));
    const cleanerNameIndex = headers.findIndex(h => h.includes('cleaner name'));
    const siteNameIndex = headers.findIndex(h => h.includes('site name'));

    if (plateIndex === -1 || amountIndex === -1 || cleanerNameIndex === -1 || siteNameIndex === -1) {
       toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Could not find all required columns: Plate, Contract Amount Cash, Cleaner Name, Site Name. Please check the pasted data.",
      });
      return;
    }


    lines.forEach((line, index) => {
      // Handle empty lines gracefully
      if (line.trim() === '') return;

      const columns = line.split(/\t|,/); 

      const cleanerName = columns[cleanerNameIndex]?.trim();
      const site = columns[siteNameIndex]?.trim();
      const carPlate = columns[plateIndex]?.trim();
      const amount = parseFloat(columns[amountIndex]?.trim());

      if (cleanerName && site && carPlate && !isNaN(amount) && amount > 0) {
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
        description: "No valid data found to import. Please check the format and try again.",
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
            Paste your data below, including the header row. The app will attempt to parse it automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={pastedData}
            onChange={(e) => setPastedData(e.target.value)}
            placeholder="SL NO,CONTRACT NO,PLATE,..."
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
