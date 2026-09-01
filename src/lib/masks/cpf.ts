import { onlyDigits } from "@/lib/validation/cpf";

/** Formats digits as the user types into `000.000.000-00`. */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  let result = parts.join(".");
  const last = digits.slice(9, 11);
  if (last) result += `-${last}`;
  return result;
}
