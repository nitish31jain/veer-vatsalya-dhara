import type { DeliveryError } from "@/lib/tokens";
import { getT } from "./server";

export async function deliveryErrorText(e: DeliveryError) {
  const { t } = await getT();
  switch (e.code) {
    case "insufficient":
      return t.errors.insufficient(e.available);
    case "already_marked":
      return t.errors.alreadyMarked;
    default:
      return t.errors.invalidPackets;
  }
}
