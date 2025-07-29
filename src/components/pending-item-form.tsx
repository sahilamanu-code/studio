"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { PendingItem } from "@/lib/types";
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
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const formSchema = z.object({
  cleanerName: z.string().min(2, "Name is required"),
  site: z.string().min(1, "Site is required"),
  carPlate: z.string().min(1, "Car Plate is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
});

type PendingItemFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item?: PendingItem;
};

export function PendingItemForm({ isOpen, setIsOpen, item }: PendingItemFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cleanerName: "",
      site: "",
      carPlate: "",
      amount: 0,
    },
  });
  
  useEffect(() => {
    if (item) {
      form.reset({
        ...item,
      });
    } else {
      form.reset({
        cleanerName: "",
        site: "",
        carPlate: "",
        amount: 0,
      });
    }
  }, [item, form, isOpen]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!item) return;

    try {
        const itemRef = doc(db, "pendingItems", item.id);
        await updateDoc(itemRef, values);
        toast({ title: "Success", description: "Pending item updated successfully." });
        setIsOpen(false);
    } catch (error) {
        console.error("Error updating pending item: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not update pending item." });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Pending Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="cleanerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cleaner Name</FormLabel>
                   <FormControl>
                    <Input placeholder="Cleaner Name" {...field} />
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
                    <Input placeholder="Site Name" {...field} />
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
                    <Input placeholder="Car Plate" {...field} />
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
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
