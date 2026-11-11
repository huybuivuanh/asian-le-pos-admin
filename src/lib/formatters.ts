import { DiscountType } from "@/types/enum";

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatTimestamp(value: unknown): string {
  try {
    if (!value || typeof (value as { toDate?: unknown }).toDate !== "function")
      return "—";
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  } catch {
    return "—";
  }
}

export function formatOrderedAt(date: Date): string {
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Epoch millis → "Nov 10, 2026", or "—". */
export function formatShortDate(millis: number | null | undefined): string {
  if (millis == null) return "—";
  return new Date(millis).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 7) {
    return (
      digits.slice(0, -7) + " " + digits.slice(-7, -4) + "-" + digits.slice(-4)
    );
  }
  return digits.slice(0, -4) + "-" + digits.slice(-4);
}

export function formatDiscountLabel(discount: Discount): string {
  if (discount.discountType === DiscountType.Percent) {
    return `Discount (${discount.discountValue}%)`;
  }
  if (discount.discountType === DiscountType.Amount) {
    return `Discount ($${discount.discountValue.toFixed(2)})`;
  }
  return "Discount";
}

export function formatDiscountAmount(discount: Discount): string {
  return `-$${discount.discountAmount.toFixed(2)}`;
}
