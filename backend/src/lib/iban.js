// Normalise un IBAN saisi librement (espaces, minuscules) : « be68 5390 0754 7034 » -> « BE68539007547034 ».
export const normalizeIban = (value) => String(value ?? "").replace(/\s+/g, "").toUpperCase();

// Contrôle de la clé IBAN (modulo 97) et de la longueur belge (16 caractères).
export function isValidIban(value) {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("BE") && iban.length !== 16) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

// « BE68539007547034 » -> « BE68 5390 0754 7034 »
export const formatIban = (value) => normalizeIban(value).replace(/(.{4})/g, "$1 ").trim();
