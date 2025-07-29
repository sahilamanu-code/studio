"use client";

import { useMemo } from "react";
import type { Collection, Deposit, PendingItem, CleanerSummary } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, parseISO } from "date-fns";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export function DashboardClient() {
  const { data: collections, loading: loadingCollections } = useFirestoreCollection<Collection>("collections");
  const { data: deposits, loading: loadingDeposits } = useFirestoreCollection<Deposit>("deposits");
  const { data: pendingItems, loading: loadingPending } = useFirestoreCollection<PendingItem>("pendingItems");

  const isLoading = loadingCollections || loadingDeposits || loadingPending;

  const cleanerSummaries = useMemo<CleanerSummary[]>(() => {
    if (isLoading) return [];
    
    const allCollections = [...collections, ...pendingItems];
    const cleanerData: { [key: string]: { collections: number, deposits: number, dates: string[] } } = {};

    allCollections.forEach(item => {
      if (!item.cleanerName) return;
      if (!cleanerData[item.cleanerName]) {
        cleanerData[item.cleanerName] = { collections: 0, deposits: 0, dates: [] };
      }
      cleanerData[item.cleanerName].collections += item.amount;
      cleanerData[item.cleanerName].dates.push(item.date);
    });

    deposits.forEach(deposit => {
      if (!deposit.cleanerName) return;
      if (!cleanerData[deposit.cleanerName]) {
        cleanerData[deposit.cleanerName] = { collections: 0, deposits: 0, dates: [] };
      }
      cleanerData[deposit.cleanerName].deposits += deposit.totalAmount;
    });

    return Object.entries(cleanerData).map(([name, data]) => {
      const sortedDates = data.dates.map(d => parseISO(d)).sort((a, b) => b.getTime() - a.getTime());
      const lastCollectionDate = sortedDates.length > 0 ? sortedDates[0] : null;
      const cashInHand = data.collections - data.deposits;

      return {
        id: name,
        name,
        totalCollections: data.collections,
        totalDeposits: data.deposits,
        cashInHand,
        lastCollectionDate: lastCollectionDate ? lastCollectionDate.toISOString() : null,
        daysSinceLastCollection: lastCollectionDate ? differenceInDays(new Date(), lastCollectionDate) : null
      };
    }).sort((a,b) => b.cashInHand - a.cashInHand);
  }, [collections, deposits, pendingItems, isLoading]);

  const totalCashInHand = useMemo(() => {
    return cleanerSummaries.reduce((acc, summary) => acc + summary.cashInHand, 0);
  }, [cleanerSummaries]);
  
  const totalAlerts = useMemo(() => {
    return cleanerSummaries.filter(s => s.cashInHand > 5000 || (s.daysSinceLastCollection ?? 0) > 3).length
  }, [cleanerSummaries]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  };

  if (isLoading) {
    return (
     <>
      <PageHeader
        title="Operations Dashboard"
        description="Overview of cash in hand and cleaner performance."
      />
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash In Hand</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleaners with Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cleaner Balances</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
        </CardContent>
      </Card>
     </>
    )
  }

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Overview of cash in hand and cleaner performance."
      />
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash In Hand</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCashInHand)}</div>
            <p className="text-xs text-muted-foreground">Across all cleaners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleaners with Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">High balance or pending deposit</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cleaner Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cleaner</TableHead>
                <TableHead className="text-right">Cash In Hand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Collection</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cleanerSummaries.map(summary => (
                <TableRow key={summary.id}>
                  <TableCell className="font-medium">{summary.name}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(summary.cashInHand)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {summary.cashInHand > 5000 && (
                        <Badge variant="destructive">Over 5000</Badge>
                      )}
                      {(summary.daysSinceLastCollection ?? 0) > 3 && summary.cashInHand > 0 && (
                        <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">Over 3 Days</Badge>
                      )}
                      {summary.cashInHand <= 0 && <Badge variant="secondary">Cleared</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {summary.lastCollectionDate ? `${summary.daysSinceLastCollection} days ago` : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
              {cleanerSummaries.length === 0 && !isLoading && (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No data available. Start by importing data or adding collections.
                    </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
