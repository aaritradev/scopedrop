export type CurrencyInfo = {
  currency: "INR" | "USD";
  symbol: string;
  isIndia: boolean;
};

let cachedCurrency: CurrencyInfo | null = null;

/**
 * Detects the user's country via ipapi.co (free, no API key required).
 * Returns INR for India, USD for everything else.
 * Falls back to INR on any error.
 *
 * Result is cached for the lifetime of the page to avoid repeated calls.
 */
export async function detectCurrency(): Promise<CurrencyInfo> {
  if (cachedCurrency) return cachedCurrency;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error("ipapi.co request failed");

    const data = await res.json();
    const isIndia = data?.country_code === "IN";

    cachedCurrency = {
      currency: isIndia ? "INR" : "USD",
      symbol: isIndia ? "₹" : "$",
      isIndia,
    };
  } catch {
    // Fallback to INR
    cachedCurrency = { currency: "INR", symbol: "₹", isIndia: true };
  }

  return cachedCurrency;
}

/**
 * Formats an amount in paise (INR) or cents (USD) to a display string.
 * e.g. 49900 paise → "₹499" / 599 cents → "$5.99"
 */
export function formatPrice(
  amountInSmallestUnit: number,
  currency: "INR" | "USD",
): string {
  if (currency === "INR") {
    const rupees = Math.round(amountInSmallestUnit / 100);
    return `₹${rupees.toLocaleString("en-IN")}`;
  } else {
    const dollars = amountInSmallestUnit / 100;
    return `$${dollars.toFixed(2)}`;
  }
}
