// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomUUID } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function correlationId(): string {
  return randomUUID();
}

/** Generates the next WO number in the form WO-YYYYMM-XXXXX. */
export function buildWoNumber(sequence: number, date = new Date()): string {
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  return `WO-${yyyymm}-${String(sequence).padStart(5, "0")}`;
}

export function formatCurrencyTHB(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string, locale: "th" | "en" = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** RFC 7807 problem+json error shape used by every API route. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

export function problem(
  status: number,
  title: string,
  detail: string,
  instance: string,
  typeSlug?: string
): ProblemDetails {
  return {
    type: `https://cmms.app/errors/${typeSlug ?? title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    status,
    detail,
    instance,
  };
}

export function paginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? 20);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
