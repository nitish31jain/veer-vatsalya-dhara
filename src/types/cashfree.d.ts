declare module "@cashfreepayments/cashfree-js" {
  type Cashfree = {
    checkout(options: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_top" | "_modal" | HTMLElement;
    }): Promise<{ error?: { message: string }; redirect?: boolean }>;
  };
  export function load(options: { mode: "sandbox" | "production" }): Promise<Cashfree>;
}
