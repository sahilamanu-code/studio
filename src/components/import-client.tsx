"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PendingItem, Collection, Deposit } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { writeBatch, doc, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { subDays } from "date-fns";
import { deleteObject, ref } from "firebase/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "./ui/separator";

export function ImportClient() {
  const [pastedData, setPastedData] = useState("");
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isPurgingAll, setIsPurgingAll] = useState(false);

  const handleParseData = async () => {
    setIsImporting(true);
    const lines = pastedData.trim().split('\n');
    const newItems: Omit<PendingItem, 'id'>[] = [];
    let errors = 0;

    const headerLine = lines.shift()?.toLowerCase();
    if (!headerLine) {
        toast({
            variant: "destructive",
            title: "Import Failed",
            description: "Pasted data is empty.",
        });
        setIsImporting(false);
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
        description: "Could not find all required columns: Plate, Contract Amount Cash, Cleaner Name, Site Name.",
      });
      setIsImporting(false);
      return;
    }


    lines.forEach((line, index) => {
      if (line.trim() === '') return;

      const columns = line.split(/\t|,/); 

      const cleanerName = columns[cleanerNameIndex]?.trim();
      const site = columns[siteNameIndex]?.trim();
      const carPlate = columns[plateIndex]?.trim();
      const amountStr = columns[amountIndex]?.trim();
      const amount = amountStr ? parseFloat(amountStr.replace(/[^0-9.-]+/g,"")) : NaN;


      if (cleanerName && site && carPlate && !isNaN(amount) && amount > 0) {
        newItems.push({
          cleanerName,
          site,
          carPlate,
          amount,
          date: new Date().toISOString(), 
        });
      } else {
          console.log(`Skipping line ${index + 2}: Invalid data. Found: cleanerName='${cleanerName}', site='${site}', carPlate='${carPlate}', amount=${amount}`);
          errors++;
      }
    });

    if (newItems.length > 0) {
      try {
        const batch = writeBatch(db);
        newItems.forEach(item => {
          const docRef = doc(collection(db, "pendingItems"));
          batch.set(docRef, item);
        });
        await batch.commit();

        toast({
          title: "Import Successful",
          description: `${newItems.length} items imported. ${errors > 0 ? `${errors} lines had errors and were skipped.` : ''}`,
        });
        setPastedData("");
      } catch (error) {
        console.error("Error writing to Firestore: ", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "An error occurred while saving the data. Please try again.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "No valid data found to import. Please check the format and try again.",
      });
    }
    setIsImporting(false);
  };

  const handlePurgeOld = async () => {
    setIsPurging(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      let deletedCount = 0;
      const slipsToDelete: string[] = [];

      const collectionsQuery = query(collection(db, "collections"), where("date", "<=", thirtyDaysAgo));
      const collectionsSnapshot = await getDocs(collectionsQuery);
      const collectionsBatch = writeBatch(db);
      collectionsSnapshot.forEach(doc => {
        collectionsBatch.delete(doc.ref);
        deletedCount++;
      });
      await collectionsBatch.commit();
      
      const depositsQuery = query(collection(db, "deposits"), where("date", "<=", thirtyDaysAgo));
      const depositsSnapshot = await getDocs(depositsQuery);
      const depositsBatch = writeBatch(db);
      depositsSnapshot.forEach(doc => {
        const depositData = doc.data() as Deposit;
        if (depositData.depositSlip) {
            slipsToDelete.push(depositData.depositSlip);
        }
        depositsBatch.delete(doc.ref);
        deletedCount++;
      });
      await depositsBatch.commit();
      
       const deletePromises = slipsToDelete.map(slipUrl => {
        try {
          const slipRef = ref(storage, slipUrl);
          return deleteObject(slipRef);
        } catch (e) {
          console.error(`Could not create storage reference for slip: ${slipUrl}`, e);
          return Promise.resolve();
        }
      });
      
      await Promise.allSettled(deletePromises);

      toast({
        title: "Purge Successful",
        description: `Successfully deleted ${deletedCount} record(s) older than 30 days.`,
      });

    } catch (error) {
      console.error("Error purging data:", error);
      toast({
        variant: "destructive",
        title: "Purge Failed",
        description: "An error occurred while purging old data.",
      });
    } finally {
      setIsPurging(false);
    }
  };

  const handlePurgeAll = async () => {
    setIsPurgingAll(true);
    let deletedCount = 0;
    try {
        const collectionsToDelete = await getDocs(collection(db, "collections"));
        const depositsToDelete = await getDocs(collection(db, "deposits"));
        const pendingToDelete = await getDocs(collection(db, "pendingItems"));
        const slipsToDelete: string[] = [];

        const batch = writeBatch(db);

        collectionsToDelete.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        pendingToDelete.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        depositsToDelete.forEach(doc => {
            const depositData = doc.data() as Deposit;
            if (depositData.depositSlip) {
                slipsToDelete.push(depositData.depositSlip);
            }
            batch.delete(doc.ref);
            deletedCount++;
        });

        await batch.commit();

        const deletePromises = slipsToDelete.map(slipUrl => {
            try {
                const slipRef = ref(storage, slipUrl);
                return deleteObject(slipRef);
            } catch (e) {
                console.error(`Could not create storage reference for slip: ${slipUrl}`, e);
                return Promise.resolve();
            }
        });
        await Promise.allSettled(deletePromises);

        toast({
            title: "Purge All Successful",
            description: `Successfully deleted ${deletedCount} record(s) from the database.`
        });
    } catch (error) {
        console.error("Error purging all data:", error);
        toast({
            variant: "destructive",
            title: "Purge Failed",
            description: "An error occurred while purging all data.",
        });
    } finally {
        setIsPurgingAll(false);
    }
};


  return (
    <>
      <PageHeader
        title="Import & Manage Data"
        description="Paste data to add pending collections or manage existing records."
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
            <CardTitle>Paste Data</CardTitle>
            <CardDescription>
                Paste your data below, including the header row. The app will attempt to parse it automatically.
                Required columns: 'Cleaner Name', 'Site Name', 'Plate', 'Contract Amount Cash'.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <Textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="SL NO,CONTRACT NO,PLATE,..."
                rows={10}
                className="font-mono text-xs"
                disabled={isImporting}
            />
            <Button onClick={handleParseData} disabled={!pastedData.trim() || isImporting}>
                {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                <Upload className="mr-2 h-4 w-4" />
                )}
                {isImporting ? "Importing..." : "Parse and Import Data"}
            </Button>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Data Management</CardTitle>
                 <CardDescription>
                    Free up space by deleting records. These actions cannot be undone. 
                    It is recommended to export your data first.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="outline" disabled={isPurging}>
                            {isPurging ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            {isPurging ? "Purging..." : "Purge Data Older Than 30 Days"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete all collection and deposit records older than 30 days, including any attached deposit slips. 
                            This cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurgeOld}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Separator />

                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={isPurgingAll}>
                            {isPurgingAll ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            {isPurgingAll ? "Purging All Data..." : "Purge All Data"}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>DANGER: Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete ALL data from the application, including collections, deposits, pending items, and all uploaded deposit slips. There is no way to recover this data.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handlePurgeAll}>Yes, delete everything</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
