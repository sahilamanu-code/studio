"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Collection } from "@/lib/types";
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
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  cleanerName: z.string().min(2, "Name is required"),
  site: z.string().min(1, "Site is required"),
  date: z.date({ required_error: "A date is required." }),
  carPlate: z.string().min(1, "Car plate is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  notes: z.string().optional(),
});

type CollectionFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collection?: Collection;
};

export function CollectionForm({ isOpen, setIsOpen, collection }: CollectionFormProps) {
  const [collections, setCollections] = useLocalStorage<Collection[]>("collections", []);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cleanerName: "",
      site: "",
      carPlate: "",
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
        date: new Date(),
        carPlate: "",
        amount: 0,
        notes: "",
      });
    }
  }, [collection, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const newCollection: Collection = {
      id: collection?.id || new Date().toISOString(),
      ...values,
      date: values.date.toISOString(),
    };

    if (collection) {
      setCollections(collections.map((c) => (c.id === collection.id ? newCollection : c)));
      toast({ title: "Success", description: "Collection updated successfully." });
    } else {
      setCollections([...collections, newCollection]);
      toast({ title: "Success", description: "Collection added successfully." });
    }
    setIsOpen(false);
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
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input placeholder="Building A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carPlate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Plate</FormLabel>
                  <FormControl>
                    <Input placeholder="P 12345" {...field} />
                  </FormControl>
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
