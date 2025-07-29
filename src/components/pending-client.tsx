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
import { HandCoins, Loader2, XCircle, Pencil } from "lucide-react";
import { db } from "@/lib/firebase";
import { writeBatch, doc, collection as firestoreCollection, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PendingItemForm } from "./pending-item-form";

export function PendingClient() {
  const { data: pendingItems, loading } = useFirestoreCollection<PendingItem>("pendingItems", {field: "date", direction: "asc"});
  const { toast } = useToast();
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | undefined>(undefined);

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

  const handleEdit = (item: PendingItem) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleReject = async (itemId: string) => {
    if (!confirm("Are you sure you want to reject and delete this pending item?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "pendingItems", itemId));
      toast({
        title: "Success",
        description: "Pending item has been rejected and deleted.",
      });
    } catch (error) {
       console.error("Error rejecting item:", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not reject item. Please try again.",
      });
    }
  };


  const handleCollect = async (item: PendingItem) => {
    setCollectingId(item.id);
    try {
      const batch = writeBatch(db);

      const newCollectionRef = doc(firestoreCollection(db, "collections"));
      const newCollectionData = {
        cleanerName: item.cleanerName,
        site: item.site,
        date: new Date().toISOString(), 
        amount: item.amount,
        notes: `Collected from pending: ${item.carPlate}`,
      };
      batch.set(newCollectionRef, newCollectionData);

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

      <PendingItemForm 
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        item={selectedItem}
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
                <div key={item.id} className="flex items-center justify-between p-4 border-b gap-2 flex-wrap">
                  <div className="flex-grow">
                    <p className="font-bold text-lg">{item.carPlate}</p>
                    <p className="text-sm text-muted-foreground">{item.site}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-lg">{formatCurrency(item.amount)}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                     <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleReject(item.id)}
                       title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCollect(item)}
                      disabled={collectingId === item.id}
                      className="min-w-[110px]"
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
