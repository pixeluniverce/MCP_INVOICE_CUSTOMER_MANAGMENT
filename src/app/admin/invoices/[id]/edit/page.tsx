"use client";
import { useParams } from "next/navigation";
import InvoiceForm from "@/components/InvoiceForm";
export default function EditInvoice() { const { id } = useParams() as { id: string }; return <InvoiceForm id={id} />; }
