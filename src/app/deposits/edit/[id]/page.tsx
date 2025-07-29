"use client";

import { DepositForm } from "@/components/deposit-form";

type EditDepositPageProps = {
    params: {
        id: string;
    }
}

export default function EditDepositPage({ params: { id } }: EditDepositPageProps) {
    return <DepositForm depositId={id} />;
}
