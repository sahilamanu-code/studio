"use client";

import { useState } from "react";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import type { Collection } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal, Trash2, Loader2, Download } from "lucide-react";
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
import { DatePicker } from "./ui/date-picker";

function convertToCSV(data: Collection[]) {
    const headers = ["Date", "Cleaner Name", "Site", "Amount", "Notes"];
    const rows = data.map(item => 
        [
            format(new Date(item.date), 'yyyy-MM-dd'),
            `"${item.cleanerName.replace(/"/g, '""')}"`,
            `"${item.site.replace(/"/g, '""')}"`,
            item.amount,
            `"${item.notes?.replace(/"/g, '""') || ''}"`
        ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}


export function CollectionsClient() {
  const { data: collections, loading } = useFirestoreCollection<Collection>("collections", {field: "date", direction: "desc"});
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportFromDate, setExportFromDate] = useState<Date | undefined>();
  const [exportToDate, setExportToDate] = useState<Date | undefined>();


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
    if (selectedIds.length === 0 || !confirm(`Are you sure you want to delete ${selectedIds.length} selected item(s)?`)) {
      return;
    }
    
    setIsDeleting(true);
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      const docRef = doc(db, "collections", id);
      batch.delete(docRef);
    });
    
    try {
      await batch.commit();
      toast({ title: "Success", description: `${selectedIds.length} collections deleted.` });
      setSelectedIds([]);
    } catch (error) {
      console.error("Error deleting collections:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete selected collections." });
    } finally {
      setIsDeleting(false);
    }
  }

  const handleExport = () => {
    if (!exportFromDate || !exportToDate) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Please select both a 'From' and 'To' date for the export.",
        });
        return;
    }
    if (exportFromDate > exportToDate) {
         toast({
            variant: "destructive",
            title: "Error",
            description: "'From' date cannot be after 'To' date.",
        });
        return;
    }

    const filteredData = collections.filter(c => {
        const collectionDate = new Date(c.date);
        return collectionDate >= exportFromDate && collectionDate <= exportToDate;
    });

    if (filteredData.length === 0) {
        toast({
            title: "No Data",
            description: "No collections found in the selected date range.",
        });
        return;
    }

    const csvData = convertToCSV(filteredData);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `collections-export-${format(exportFromDate, 'yyyy-MM-dd')}-to-${format(exportToDate, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {selectedIds.length > 0 && (
          <Button variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete ({selectedIds.length})
          </Button>
        )}
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Collection
        </Button>
      </PageHeader>

      <CollectionForm
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        collection={selectedCollection}
      />
      <Card className="mb-8">
        <CardHeader>
            <CardTitle>Export Collections</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <div className="grid gap-2 w-full sm:w-auto">
                <label htmlFor="from-date" className="text-sm font-medium">From</label>
                <DatePicker date={exportFromDate} setDate={setExportFromDate} />
            </div>
            <div className="grid gap-2 w-full sm:w-auto">
                <label htmlFor="to-date" className="text-sm font-medium">To</label>
                <DatePicker date={exportToDate} setDate={setExportToDate} />
            </div>
            <Button onClick={handleExport} className="w-full sm:w-auto sm:self-end">
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
            </Button>
        </CardContent>
      </Card>


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
