"use client";

import { DepositForm } from "@/components/deposit-form";

type EditDepositPageProps = {
    params: {
        id: string;
    }
}

export default function EditDepositPage({ params }: EditDepositPageProps) {
    return <DepositForm depositId={params.id} />;
}
