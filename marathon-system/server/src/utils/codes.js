import crypto from 'node:crypto';

export function generateNumericCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

export function generateBibNumber(prefix = 'M', sequence) {
  return `${prefix}${String(sequence).padStart(5, '0')}`;
}

export function generateOrderNo() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const random = crypto.randomInt(1000, 9999);
  return `MRS${stamp}${random}`;
}
