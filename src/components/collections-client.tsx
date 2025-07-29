"use client";

import { useState } from "react";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import type { Collection } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Trash2, Loader2 } from "lucide-react";
import { CollectionForm } from "./collection-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "./ui/skeleton";
import { Checkbox } from "./ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export function CollectionsClient() {
  const { data: collections, loading } = useFirestoreCollection<Collection>("collections", {field: "date", direction: "desc"});
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);


  const handleAdd = () => {
    setSelectedCollection(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (collection: Collection) => {
    setSelectedCollection(collection);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this collection?")) {
        try {
            await deleteDoc(doc(db, "collections", id));
            toast({ title: "Success", description: "Collection deleted." });
        } catch (error) {
            console.error("Error deleting collection:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete collection." });
        }
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected item(s)?`)) {
        setIsDeleting(true);
        const batch = writeBatch(db);
        selectedIds.forEach(id => {
            const docRef = doc(db, "collections", id);
            batch.delete(docRef);
        });
        
        try {
            await batch.commit();
            setSelectedIds([]);
            toast({ title: "Success", description: `${selectedIds.length} collections deleted.` });
        } catch (error) {
            console.error("Error deleting collections:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete selected collections." });
        } finally {
            setIsDeleting(false);
        }
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  const toggleSelectAll = () => {
    if (collections && collections.length > 0 && selectedIds.length === collections.length) {
      setSelectedIds([]);
    } else if (collections) {
      setSelectedIds(collections.map(c => c.id));
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  };
  
  return (
    <>
      <PageHeader title="Cash Collections" description="Log all daily cash collections from cleaners.">
        {selectedIds.length > 0 ? (
          <Button variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete ({selectedIds.length})
          </Button>
        ) : (
          <Button onClick={handleAdd}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Collection
          </Button>
        )}
      </PageHeader>

      <CollectionForm
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        collection={selectedCollection}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Collections</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                   <Checkbox 
                    checked={collections && collections.length > 0 && selectedIds.length === collections.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    disabled={!collections || collections.length === 0}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Site</TableHead>
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
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 inline-block" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : collections && collections.length > 0 ? (
                collections.map((collection) => (
                  <TableRow key={collection.id} data-state={selectedIds.includes(collection.id) ? "selected" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(collection.id)}
                        onCheckedChange={() => toggleSelect(collection.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell>{format(new Date(collection.date), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{collection.cleanerName}</TableCell>
                    <TableCell>{collection.site}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(collection.amount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(collection)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(collection.id)} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No collections recorded yet.
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
