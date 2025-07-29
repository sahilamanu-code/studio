"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Collection, Deposit, PendingItem, CleanerSummary } from "@/lib/types";
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
import { useEffect, useMemo, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, parseISO } from "date-fns";
import { Card, CardContent } from "./ui/card";
import { Banknote, CreditCard, Paperclip, X } from "lucide-react";
import Image from 'next/image';


const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  cleanerName: z.string().min(2, "Please select a cleaner."),
  site: z.string().min(1, "Please select a site."),
  cashAmount: z.coerce.number().min(0).default(0),
  cardAmount: z.coerce.number().min(0).default(0),
  depositSlip: z.string().optional(),
}).refine(data => data.cashAmount > 0 || data.cardAmount > 0, {
  message: "At least one amount (cash or card) must be greater than 0.",
  path: ["cashAmount"],
});


type DepositFormProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  deposit?: Deposit;
};

export function DepositForm({ isOpen, setIsOpen, deposit }: DepositFormProps) {
  const [deposits, setDeposits] = useLocalStorage<Deposit[]>("deposits", []);
  const [collections] = useLocalStorage<Collection[]>("collections", []);
  const [pendingItems] = useLocalStorage<PendingItem[]>("pendingItems", []);
  const [cashInHand, setCashInHand] = useState<number | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | undefined>(undefined);

  const allCollectionSources = useMemo(() => [...collections, ...pendingItems], [collections, pendingItems]);

  const cleanerNames = useMemo(() => {
    const names = new Set(allCollectionSources.map(c => c.cleanerName));
    return Array.from(names).sort();
  }, [allCollectionSources]);
  
  const siteNames = useMemo(() => {
    const sites = new Set(allCollectionSources.map(c => c.site));
    return Array.from(sites).sort();
  }, [allCollectionSources]);

  const cleanerSummaries = useMemo<CleanerSummary[]>(() => {
    const allCollections = [...collections, ...pendingItems];
    const cleanerData: { [key: string]: { collections: number, deposits: number, dates: string[] } } = {};

    allCollections.forEach(item => {
      if (!cleanerData[item.cleanerName]) {
        cleanerData[item.cleanerName] = { collections: 0, deposits: 0, dates: [] };
      }
      cleanerData[item.cleanerName].collections += item.amount;
      cleanerData[item.cleanerName].dates.push(item.date);
    });

    deposits.forEach(deposit => {
      if (!cleanerData[deposit.cleanerName]) {
        cleanerData[deposit.cleanerName] = { collections: 0, deposits: 0, dates: [] };
      }
      cleanerData[deposit.cleanerName].deposits += deposit.totalAmount;
    });

    return Object.entries(cleanerData).map(([name, data]) => {
      const sortedDates = data.dates.map(d => parseISO(d)).sort((a, b) => b.getTime() - a.getTime());
      const lastCollectionDate = sortedDates.length > 0 ? sortedDates[0] : null;
      const cashInHand = data.collections - data.deposits;

      return {
        name,
        totalCollections: data.collections,
        totalDeposits: data.deposits,
        cashInHand,
        lastCollectionDate: lastCollectionDate ? lastCollectionDate.toISOString() : null,
        daysSinceLastCollection: lastCollectionDate ? differenceInDays(new Date(), lastCollectionDate) : null
      };
    });
  }, [collections, deposits, pendingItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cleanerName: "",
      site: "",
      cashAmount: 0,
      cardAmount: 0,
    },
  });
  
  const selectedCleanerName = form.watch("cleanerName");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue("depositSlip", dataUrl);
        setPreviewImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (selectedCleanerName) {
      const summary = cleanerSummaries.find(s => s.name === selectedCleanerName);
      let effectiveCashInHand = summary?.cashInHand ?? 0;
      if (deposit && deposit.cleanerName === selectedCleanerName) {
         effectiveCashInHand += deposit.totalAmount;
      }
      setCashInHand(effectiveCashInHand);
    } else {
      setCashInHand(null);
    }
  }, [selectedCleanerName, cleanerSummaries, deposit]);


  useEffect(() => {
    if (deposit) {
      form.reset({
        ...deposit,
        cashAmount: deposit.cashAmount || 0,
        cardAmount: deposit.cardAmount || 0,
        date: new Date(deposit.date),
      });
      setPreviewImage(deposit.depositSlip);
    } else {
      form.reset({
        date: new Date(),
        cleanerName: "",
        site: "",
        cashAmount: 0,
        cardAmount: 0,
        depositSlip: "",
      });
       setPreviewImage(undefined);
    }
  }, [deposit, form, isOpen]);


  function onSubmit(values: z.infer<typeof formSchema>) {
    const totalAmount = (values.cashAmount || 0) + (values.cardAmount || 0);

    const newDeposit: Deposit = {
      id: deposit?.id || new Date().toISOString(),
      ...values,
      date: values.date.toISOString(),
      totalAmount,
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
      <DialogContent className="sm:max-w-lg">
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
            {cashInHand !== null && (
              <Card className="bg-muted border-dashed">
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">Cash in Hand for {selectedCleanerName}</p>
                  <p className="text-lg font-bold">{formatCurrency(cashInHand)}</p>
                </CardContent>
              </Card>
            )}
            <FormField
              control={form.control}
              name="site"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cashAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Banknote className="h-4 w-4 text-muted-foreground"/> Cash</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cardAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground"/> Card</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="depositSlip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Slip</FormLabel>
                  <FormControl>
                    <>
                      <Input 
                        type="file" 
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                       <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Paperclip className="mr-2 h-4 w-4"/>
                          Attach Slip
                       </Button>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {previewImage && (
               <div className="relative w-full max-w-xs h-auto">
                <Image src={previewImage} alt="Deposit slip preview" width={200} height={200} className="rounded-md border object-contain"/>
                 <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => {
                        form.setValue("depositSlip", undefined);
                        setPreviewImage(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                 >
                    <X className="h-4 w-4" />
                 </Button>
               </div>
            )}
            <DialogFooter>
              <Button type="submit">Save Deposit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
