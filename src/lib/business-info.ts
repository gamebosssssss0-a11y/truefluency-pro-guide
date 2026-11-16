/**
 * Who TrueFluency is, as it may be shown to students on receipts and billing screens.
 *
 * TrueFluency is a startup that is NOT incorporated or registered yet (owner, 2026-11-16). Never add a company name, an RC number,
 * a tax number or a registered address here unless one really exists. Support today is WhatsApp (the numbers already used on the
 * Support screen); there is no support email, so SUPPORT_EMAIL stays null until the owner provides a real one.
 */
import { SUPPORT_ISSUES } from "@/lib/support-issues";

export const BUSINESS_NAME = "TrueFluency";
export const BUSINESS_STATUS_NOTE = "TrueFluency is run by its founders and is not yet a registered company.";

/** A real, monitored address, or null. When set it is shown next to the WhatsApp link. */
export const SUPPORT_EMAIL: string | null = null;

/** The WhatsApp number the Support screen already uses first. */
export const SUPPORT_WHATSAPP: string = SUPPORT_ISSUES[0]?.phone ?? "";

export function whatsappLink(text: string): string | null {
  return SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}` : null;
}
