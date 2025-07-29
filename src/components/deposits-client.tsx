"use client";

import { useState } from "react";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import type { Deposit } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { deleteObject, ref } from "firebase/storage";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import { useRouter } from "next/navigation";
import { Checkbox } from "./ui/checkbox";
import { useToast } from "@/hooks/use-toast";


export function DepositsClient() {
  const { data: deposits, loading } = useFirestoreCollection<Deposit>("deposits", {field: "date", direction: "desc"});
  const router = useRouter();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);


  const handleEdit = (depositId: string) => {
    router.push(`/deposits/edit/${depositId}`);
  };

  const handleDelete = async (deposit: Deposit) => {
    if (confirm("Are you sure you want to delete this deposit record?")) {
        try {
            await deleteDoc(doc(db, "deposits", deposit.id));
            if (deposit.depositSlip) {
              try {
                const slipRef = ref(storage, deposit.depositSlip);
                await deleteObject(slipRef);
              } catch (err) {
                 console.error("Error deleting slip image: ", err)
              }
            }
            toast({ title: "Success", description: "Deposit deleted." });
        } catch (error) {
            console.error("Error deleting deposit:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete deposit." });
        }
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected item(s)?`)) {
      return;
    }
    
    setIsDeleting(true);
    const batch = writeBatch(db);
    const slipsToDelete: string[] = [];

    const depositsToDelete = deposits.filter(d => selectedIds.has(d.id));

    depositsToDelete.forEach(deposit => {
        const docRef = doc(db, "deposits", deposit.id);
        batch.delete(docRef);
        if (deposit.depositSlip) {
          slipsToDelete.push(deposit.depositSlip);
        }
    });

    try {
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
      
      toast({ title: "Success", description: `${selectedIds.size} deposits deleted.` });
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error batch deleting deposits: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete selected deposits." });
    } finally {
      setIsDeleting(false);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  const toggleSelectAll = () => {
    if (deposits && deposits.length > 0 && selectedIds.size === deposits.length) {
      setSelectedIds(new Set());
    } else if (deposits) {
      setSelectedIds(new Set(deposits.map(d => d.id)));
    }
  }
  
  const numSelected = selectedIds.size;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  };

  return (
    <>
      <PageHeader title="Bank Deposits" description="Record all bank deposits made.">
        {numSelected > 0 && (
          <Button variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete ({numSelected})
          </Button>
        )}
        <Button asChild>
          <Link href="/deposits/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Record Deposit
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>All Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                   <Checkbox 
                    checked={deposits && deposits.length > 0 && numSelected === deposits.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    disabled={!deposits || deposits.length === 0}
                   />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Slip</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 inline-block" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : deposits && deposits.length > 0 ? (
                deposits.map((deposit) => (
                  <TableRow key={deposit.id} data-state={selectedIds.has(deposit.id) ? "selected" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(deposit.id)}
                        onCheckedChange={() => toggleSelect(deposit.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell>{format(new Date(deposit.date), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{deposit.cleanerName}</TableCell>
                    <TableCell>{deposit.site}</TableCell>
                    <TableCell>
                      {deposit.depositSlip && (
                        <a href={deposit.depositSlip} target="_blank" rel="noopener noreferrer">
                          <Image src={deposit.depositSlip} alt="Deposit slip" width={40} height={40} className="rounded-md object-cover" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {deposit.cashAmount > 0 && <Badge variant="secondary">Cash</Badge>}
                        {deposit.cardAmount > 0 && <Badge variant="outline">Card</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <div className="flex flex-col items-end">
                        {deposit.cashAmount > 0 && <span>{formatCurrency(deposit.cashAmount)}</span>}
                        {deposit.cardAmount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(deposit.cardAmount)}
                            {deposit.authCode && ` (${deposit.authCode})`}
                          </span>
                        )}
                         <span className="font-bold border-t mt-1 pt-1">{formatCurrency(deposit.totalAmount)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(deposit.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(deposit)} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    No deposits recorded yet.
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
