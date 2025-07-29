"use client";

import { useMemo, useState } from "react";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import type { PendingItem } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HandCoins, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { writeBatch, doc, collection as firestoreCollection, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export function PendingClient() {
  const { data: pendingItems, loading } = useFirestoreCollection<PendingItem>("pendingItems", {field: "date", direction: "asc"});
  const { toast } = useToast();
  const [collectingId, setCollectingId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(amount);
  };

  const groupedByCleaner = useMemo(() => {
    return pendingItems.reduce((acc, item) => {
      const { cleanerName } = item;
      if (!acc[cleanerName]) {
        acc[cleanerName] = [];
      }
      acc[cleanerName].push(item);
      return acc;
    }, {} as Record<string, PendingItem[]>);
  }, [pendingItems]);

  const handleCollect = async (item: PendingItem) => {
    setCollectingId(item.id);
    try {
      const batch = writeBatch(db);

      // 1. Create a new document in 'collections'
      const newCollectionRef = doc(firestoreCollection(db, "collections"));
      const newCollectionData = {
        cleanerName: item.cleanerName,
        site: item.site,
        date: item.date, // or new Date().toISOString() if you want collection date to be now
        amount: item.amount,
        notes: `Collected from pending: ${item.carPlate}`,
      };
      batch.set(newCollectionRef, newCollectionData);

      // 2. Delete the document from 'pendingItems'
      const pendingItemRef = doc(db, "pendingItems", item.id);
      batch.delete(pendingItemRef);

      await batch.commit();

      toast({
        title: "Success!",
        description: `Collection for ${item.carPlate} recorded.`,
      });
    } catch (error) {
      console.error("Error collecting item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not process collection. Please try again.",
      });
    } finally {
        setCollectingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Pending Collections"
        description="Review imported items and confirm them as collected."
      />

      {loading && <p>Loading pending items...</p>}

      {!loading && pendingItems.length === 0 && (
          <Card>
              <CardContent className="p-6">
                 <p className="text-center text-muted-foreground">There are no pending items to collect. Import data to get started.</p>
              </CardContent>
          </Card>
      )}

      <Accordion type="multiple" className="w-full space-y-2">
        {Object.entries(groupedByCleaner).map(([cleanerName, items]) => (
          <AccordionItem value={cleanerName} key={cleanerName}>
            <AccordionTrigger className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md text-base font-medium">
                <div className="flex justify-between w-full pr-4">
                    <span>{cleanerName}</span>
                    <span className="text-primary">{items.length} pending</span>
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="border-t">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border-b">
                  <div>
                    <p className="font-bold text-lg">{item.carPlate}</p>
                    <p className="text-sm text-muted-foreground">{item.site}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-lg">{formatCurrency(item.amount)}</span>
                    <Button
                      size="sm"
                      onClick={() => handleCollect(item)}
                      disabled={collectingId === item.id}
                    >
                      {collectingId === item.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <HandCoins className="mr-2 h-4 w-4" />
                      )}
                      Collect
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
