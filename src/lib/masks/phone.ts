import { onlyDigits } from "@/lib/validation/cpf";

/**
 * A Brazilian phone as the trainer types it: "(11) 98765-4321" (11 digits) or "(11) 3456-7890"
 * (10). The value sent is the digits only; this is just how the field reads. A pasted or autofilled
 * "+55 11 98765-4321" (or a trunk "0" before the area code) loses that prefix: the number is stored
 * without the country code, which the client's WhatsApp link adds.
 */
export function maskPhone(value: string): string {
  let digits = onlyDigits(value);
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits.length === 0 ? "" : `(${digits}`;
  const area = `(${digits.slice(0, 2)}) `;
  const rest = digits.slice(2);
  const split = digits.length === 11 ? 5 : 4;
  return rest.length <= split ? area + rest : `${area}${rest.slice(0, split)}-${rest.slice(split)}`;
}
