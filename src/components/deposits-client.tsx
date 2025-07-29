"use client";

import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Deposit } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { DepositForm } from "./deposit-form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import Image from "next/image";

export function DepositsClient() {
  const [deposits, setDeposits] = useLocalStorage<Deposit[]>("deposits", []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | undefined>(undefined);

  const handleAdd = () => {
    setSelectedDeposit(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this deposit record?")) {
        setDeposits(deposits.filter(d => d.id !== id));
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  };

  const sortedDeposits = [...deposits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <PageHeader title="Bank Deposits" description="Record all bank deposits made.">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Deposit
        </Button>
      </PageHeader>

      <DepositForm
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        deposit={selectedDeposit}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Cleaner</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Slip</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedDeposits.length > 0 ? (
                sortedDeposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>{format(new Date(deposit.date), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{deposit.cleanerName}</TableCell>
                    <TableCell>{deposit.site}</TableCell>
                    <TableCell>
                      {deposit.depositSlip && (
                        <Image src={deposit.depositSlip} alt="Deposit slip" width={40} height={40} className="rounded-md object-cover" />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(deposit.totalAmount)}</TableCell>
                    <TableCell>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(deposit)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(deposit.id)} className="text-destructive">
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
