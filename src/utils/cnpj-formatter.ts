const CNPJ_RE = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const CEI_RE = /^\d{2}\.\d{3}\.\d{5}\/\d{2}$/;

export function formatCnpjCei(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }

  const stringValue = String(value).trim();

  if (CNPJ_RE.test(stringValue) || CEI_RE.test(stringValue)) {
    return stringValue;
  }

  const digits = stringValue.replace(/\D/g, '');

  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  if (digits.length === 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 10)}/${digits.slice(10)}`;
  }

  throw new Error(`Valor não é CNPJ (14) nem CEI (12). Dígitos=${digits.length}. Valor=${value}`);
}