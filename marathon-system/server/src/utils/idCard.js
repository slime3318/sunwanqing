const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

export function isValidChineseIdCard(value) {
  if (typeof value !== 'string') return false;

  const id = value.trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(id)) return false;

  const birth = id.slice(6, 14);
  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));
  if (!isValidDate(year, month, day)) return false;

  const sum = WEIGHTS.reduce((total, weight, index) => total + weight * Number(id[index]), 0);
  return CHECK_CODES[sum % 11] === id[17];
}

function isValidDate(year, month, day) {
  if (year < 1900 || year > new Date().getFullYear() + 1) return false;
  if (month < 1 || month > 12) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseIdCard(id) {
  const value = String(id).trim().toUpperCase();
  if (!isValidChineseIdCard(value)) return null;

  const birth = value.slice(6, 14);
  const genderCode = Number(value[16]);

  return {
    idCard: value,
    birthDate: new Date(`${birth.slice(0, 4)}-${birth.slice(4, 6)}-${birth.slice(6, 8)}T00:00:00.000Z`),
    gender: genderCode % 2 === 1 ? 'male' : 'female',
    age: calculateAge(birth),
  };
}

function calculateAge(birth) {
  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));
  const today = new Date();
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function maskIdCard(value) {
  const id = String(value || '');
  if (id.length < 8) return '****';
  return `${id.slice(0, 4)}**********${id.slice(-4)}`;
}

export function maskPhone(value) {
  const phone = String(value || '');
  if (phone.length < 7) return '****';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
