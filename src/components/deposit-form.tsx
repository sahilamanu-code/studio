"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { Collection, Deposit, PendingItem, CleanerSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Banknote, CreditCard, Paperclip, X, Loader2, CheckCircle } from "lucide-react";
import Image from 'next/image';
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";
import { addDoc, collection as firestoreCollection, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadString, deleteObject } from "firebase/storage";
import { useRouter } from "next/navigation";
import { PageHeader } from "./page-header";
import { motion } from "framer-motion";


const formSchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  cleanerName: z.string().min(2, "Please select a cleaner."),
  site: z.string().min(1, "Please select a site."),
  cashAmount: z.coerce.number().min(0).default(0),
  cardAmount: z.coerce.number().min(0).default(0),
  authCode: z.string().optional(),
  depositSlipPreview: z.string().optional(),
}).refine(data => data.cashAmount > 0 || data.cardAmount > 0, {
  message: "At least one amount (cash or card) must be greater than 0.",
  path: ["cashAmount"],
});

type FormValues = z.infer<typeof formSchema>;

type DepositFormProps = {
  depositId?: string;
};

export function DepositForm({ depositId }: DepositFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { data: collections } = useFirestoreCollection<Collection>('collections');
  const { data: pendingItems } = useFirestoreCollection<PendingItem>('pendingItems');
  const { data: deposits } = useFirestoreCollection<Deposit>('deposits');
  const [cashInHand, setCashInHand] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialDeposit, setInitialDeposit] = useState<Deposit | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedDeposit, setSubmittedDeposit] = useState<FormValues & { totalAmount: number } | null>(null);

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
      if (!item.cleanerName) return;
      if (!cleanerData[item.cleanerName]) {
        cleanerData[item.cleanerName] = { collections: 0, deposits: 0, dates: [] };
      }
      cleanerData[item.cleanerName].collections += item.amount;
      cleanerData[item.cleanerName].dates.push(item.date);
    });

    deposits.forEach(deposit => {
      if (!deposit.cleanerName) return;
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
        id: name,
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: undefined,
      cleanerName: "",
      site: "",
      cashAmount: 0,
      cardAmount: 0,
      authCode: "",
      depositSlipPreview: "",
    },
  });
  
  const selectedCleanerName = form.watch("cleanerName");
  const depositSlipPreview = form.watch("depositSlipPreview");
  const cardAmount = form.watch("cardAmount");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue("depositSlipPreview", dataUrl, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const clearImage = () => {
      form.setValue("depositSlipPreview", undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    if (selectedCleanerName) {
      const summary = cleanerSummaries.find(s => s.name === selectedCleanerName);
      let effectiveCashInHand = summary?.cashInHand ?? 0;
      if (depositId && initialDeposit && initialDeposit.cleanerName === selectedCleanerName) {
         effectiveCashInHand += initialDeposit.totalAmount;
      }
      setCashInHand(effectiveCashInHand);
    } else {
      setCashInHand(null);
    }
  }, [selectedCleanerName, cleanerSummaries, initialDeposit, depositId]);


  useEffect(() => {
    const fetchDeposit = async () => {
        if (depositId) {
            const docRef = doc(db, "deposits", depositId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const depositData = { id: docSnap.id, ...docSnap.data()} as Deposit;
                setInitialDeposit(depositData);
                form.reset({
                    ...depositData,
                    cashAmount: depositData.cashAmount || 0,
                    cardAmount: depositData.cardAmount || 0,
                    authCode: depositData.authCode || "",
                    date: new Date(depositData.date),
                    depositSlipPreview: depositData.depositSlip,
                });
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Deposit not found.'});
                router.push('/deposits');
            }
        }
    };
    fetchDeposit();
  }, [depositId, form, router, toast]);


  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
        const docId = depositId || doc(firestoreCollection(db, "deposits")).id;
        let fileUrl = initialDeposit?.depositSlip || "";

        if (values.depositSlipPreview && values.depositSlipPreview.startsWith('data:')) {
             const storageRef = ref(storage, `depositSlips/${docId}`);
             await uploadString(storageRef, values.depositSlipPreview, 'data_url');
             fileUrl = await getDownloadURL(storageRef);
        } else if (!values.depositSlipPreview && initialDeposit?.depositSlip) {
            const storageRef = ref(storage, initialDeposit.depositSlip);
            await deleteObject(storageRef).catch(err => console.log("No image to delete or error:", err));
            fileUrl = "";
        }

        const totalAmount = (values.cashAmount || 0) + (values.cardAmount || 0);
        
        const depositData: Omit<Deposit, "id"> = {
            date: values.date.toISOString(),
            cleanerName: values.cleanerName,
            site: values.site,
            cashAmount: values.cashAmount,
            cardAmount: values.cardAmount,
            totalAmount,
            depositSlip: fileUrl,
            authCode: values.authCode,
        };

        const docRef = doc(db, "deposits", docId);
        await setDoc(docRef, depositData); 
        
        if (depositId) {
          toast({ title: "Success", description: "Deposit updated successfully." });
          router.push("/deposits");
        } else {
          setSubmittedDeposit({ ...values, totalAmount });
          setIsSuccess(true);
        }

    } catch (error) {
        console.error("Error submitting deposit: ", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save deposit record." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const recordAnother = () => {
    setIsSuccess(false);
    setSubmittedDeposit(null);
    form.reset({
      date: new Date(),
      cleanerName: "",
      site: "",
      cashAmount: 0,
      cardAmount: 0,
      authCode: "",
      depositSlipPreview: "",
    });
    setCashInHand(null);
  };
  
  if (isSuccess && submittedDeposit) {
    return (
        <>
            <PageHeader 
                title="Deposit Recorded"
                description="The deposit has been successfully added to the system."
            />
            <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                        }}
                    >
                        <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
                    </motion.div>
                    <h2 className="text-2xl font-bold mb-2">Success!</h2>
                    <Card className="w-full max-w-md my-4 text-left">
                        <CardHeader>
                            <CardTitle className="text-lg">Deposit Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div className="text-muted-foreground">Cleaner:</div>
                            <div className="font-medium">{submittedDeposit.cleanerName}</div>
                            <div className="text-muted-foreground">Site:</div>
                            <div className="font-medium">{submittedDeposit.site}</div>
                            <div className="text-muted-foreground">Date:</div>
                            <div className="font-medium">{submittedDeposit.date.toLocaleDateString()}</div>
                             {submittedDeposit.cashAmount > 0 && <>
                                <div className="text-muted-foreground">Cash Amount:</div>
                                <div className="font-medium">{formatCurrency(submittedDeposit.cashAmount)}</div>
                             </>}
                             {submittedDeposit.cardAmount > 0 && <>
                                <div className="text-muted-foreground">Card Amount:</div>
                                <div className="font-medium">{formatCurrency(submittedDeposit.cardAmount)}</div>
                             </>}
                             <div className="text-muted-foreground font-bold border-t pt-2 mt-1">Total Amount:</div>
                            <div className="font-bold border-t pt-2 mt-1">{formatCurrency(submittedDeposit.totalAmount)}</div>
                        </CardContent>
                    </Card>
                    <Button onClick={recordAnother}>Record Another Deposit</Button>
                </CardContent>
            </Card>
        </>
    );
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <>
    <PageHeader 
        title={depositId ? "Edit Deposit" : "Record New Deposit"}
        description="Record a bank deposit for a cleaner. The amount will be deducted from their cash in hand."
    />
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
    <Card>
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            </div>

            {cashInHand !== null && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card className="bg-muted border-dashed">
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground">Cash in Hand for {selectedCleanerName}</p>
                    <p className="text-lg font-bold">{formatCurrency(cashInHand)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            
            <FormField
              control={form.control}
              name="site"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {cardAmount > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                 <FormField
                    control={form.control}
                    name="authCode"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Authorization Code</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter auth code for card payment" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                </motion.div>
            )}
             <FormField
              control={form.control}
              name="depositSlipPreview"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Slip</FormLabel>
                  <FormControl>
                    <div>
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
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {depositSlipPreview && (
               <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-xs h-auto">
                <Image src={depositSlipPreview} alt="Deposit slip preview" width={200} height={200} className="rounded-md border object-contain"/>
                 <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={clearImage}
                 >
                    <X className="h-4 w-4" />
                 </Button>
               </motion.div>
            )}
            <div className="flex gap-2 justify-end">
              {depositId && <Button type="button" variant="ghost" onClick={() => router.push('/deposits')}>Cancel</Button> }
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : (depositId ? 'Update Deposit' : 'Save Deposit')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </motion.div>
    </>
  );
}
