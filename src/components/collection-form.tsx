"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { Collection, PendingItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "./ui/date-picker";
import { useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection as firestoreCollection, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const formSchema = z.object({
  cleanerName: z.string().min(2, "Name is required"),
  site: z.string().min(1, "Site is required"),
  date: z.date({ required_error: "A date is required." }),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  notes: z.string().optional(),
});

type CollectionFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collection?: Collection;
};

export function CollectionForm({ isOpen, setIsOpen, collection }: CollectionFormProps) {
  const { toast } = useToast();
  const { data: collections } = useFirestoreCollection<Collection>("collections");
  const { data: pendingItems } = useFirestoreCollection<PendingItem>("pendingItems");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allCollectionSources = useMemo(() => [...collections, ...pendingItems], [collections, pendingItems]);

  const cleanerNames = useMemo(() => {
    const names = new Set(allCollectionSources.map(c => c.cleanerName));
    return Array.from(names).sort();
  }, [allCollectionSources]);

  const siteNames = useMemo(() => {
    const sites = new Set(allCollectionSources.map(c => c.site));
    return Array.from(sites).sort();
  }, [allCollectionSources]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cleanerName: "",
      site: "",
      date: new Date(),
      amount: 0,
      notes: "",
    },
  });
  
  useEffect(() => {
    if (collection) {
      form.reset({
        ...collection,
        date: new Date(collection.date),
      });
    } else {
      form.reset({
        cleanerName: "",
        site: "",
        date: undefined,
        amount: 0,
        notes: "",
      });
    }
  }, [collection, form, isOpen, isMounted]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const newCollectionData = {
            ...values,
            date: values.date.toISOString(),
        };

        if (collection) {
            const collectionRef = doc(db, "collections", collection.id);
            await updateDoc(collectionRef, newCollectionData);
            toast({ title: "Success", description: "Collection updated successfully." });
        } else {
            await addDoc(firestoreCollection(db, "collections"), newCollectionData);
            toast({ title: "Success", description: "Collection added successfully." });
        }
        setIsOpen(false);
    } catch (error) {
        console.error("Error saving collection: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save collection." });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{collection ? "Edit Collection" : "Add New Collection"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <DatePicker date={field.value} setDate={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cleanerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cleaner Name</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cleaner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cleanerNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="site"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a site" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {siteNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (AED)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="500.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes about the collection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Collection</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
