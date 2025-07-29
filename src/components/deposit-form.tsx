"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Collection, Deposit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "./ui/date-picker";
import { useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  cleanerName: z.string().min(2, "Please select a cleaner."),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  depositSlip: z.string().optional(), // For MVP, this field is not a file upload
});

type DepositFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  deposit?: Deposit;
};

export function DepositForm({ isOpen, setIsOpen, deposit }: DepositFormProps) {
  const [deposits, setDeposits] = useLocalStorage<Deposit[]>("deposits", []);
  const [collections] = useLocalStorage<Collection[]>("collections", []);
  const { toast } = useToast();

  const cleanerNames = useMemo(() => {
    const names = new Set(collections.map(c => c.cleanerName));
    return Array.from(names).sort();
  }, [collections]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cleanerName: "",
      amount: 0,
    },
  });

  useEffect(() => {
    if (deposit) {
      form.reset({
        ...deposit,
        date: new Date(deposit.date),
      });
    } else {
      form.reset({
        date: new Date(),
        cleanerName: "",
        amount: 0,
        depositSlip: "",
      });
    }
  }, [deposit, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const newDeposit: Deposit = {
      id: deposit?.id || new Date().toISOString(),
      ...values,
      date: values.date.toISOString(),
    };

    if (deposit) {
      setDeposits(deposits.map((d) => (d.id === deposit.id ? newDeposit : d)));
      toast({ title: "Success", description: "Deposit updated successfully." });
    } else {
      setDeposits([...deposits, newDeposit]);
      toast({ title: "Success", description: "Deposit recorded successfully." });
    }
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{deposit ? "Edit Deposit" : "Record New Deposit"}</DialogTitle>
          <DialogDescription>
            Record a bank deposit for a cleaner. The amount will be deducted from their cash in hand.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Deposit</FormLabel>
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
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Deposited (AED)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="500.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Deposit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
