export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function checkDigit(digits: string, factorStart: number): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[i]) * (factorStart - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** Mirrors vertice-api's `@Cpf` validator: length, all-same-digit, and check-digit rules. */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const firstCheck = checkDigit(digits.slice(0, 9), 10);
  if (firstCheck !== Number(digits[9])) return false;

  const secondCheck = checkDigit(digits.slice(0, 10), 11);
  if (secondCheck !== Number(digits[10])) return false;

  return true;
}
