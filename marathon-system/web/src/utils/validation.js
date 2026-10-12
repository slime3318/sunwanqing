const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

export function isValidIdCard(value) {
  const id = String(value || '').trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(id)) return false;

  const year = Number(id.slice(6, 10));
  const month = Number(id.slice(10, 12));
  const day = Number(id.slice(12, 14));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const sum = WEIGHTS.reduce((total, weight, index) => total + weight * Number(id[index]), 0);
  return CHECK_CODES[sum % 11] === id[17];
}

export function parseIdCard(value) {
  const id = String(value || '').trim().toUpperCase();
  if (!isValidIdCard(id)) return null;

  const birth = id.slice(6, 14);
  const today = new Date();
  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age -= 1;
  }

  return {
    idCard: id,
    gender: Number(id[16]) % 2 === 1 ? 'male' : 'female',
    birthDate: `${birth.slice(0, 4)}-${birth.slice(4, 6)}-${birth.slice(6, 8)}`,
    age,
  };
}

export function isValidPhone(value) {
  return /^1[3-9]\d{9}$/.test(String(value || '').trim());
}

export function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function isStrongPassword(value) {
  const password = String(value || '');
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

/**
 * 与后端 zod 校验保持一致的前端校验，用于点击提交前即时反馈。
 */
export function validateParticipantForm(form) {
  const errors = {};

  if (!form.name || form.name.trim().length < 2) errors['participant.name'] = '请填写真实姓名（至少 2 个字）';

  if (!isValidIdCard(form.idCard)) errors['participant.idCard'] = '身份证号不合法，请检查后重新输入';

  if (!isValidPhone(form.phone)) errors['participant.phone'] = '请输入 11 位有效手机号';

  if (!isValidEmail(form.email)) errors['participant.email'] = '邮箱格式不正确';

  if (!form.emergencyContactName) errors['participant.emergencyContact.name'] = '请填写紧急联系人姓名';

  if (!isValidPhone(form.emergencyContactPhone)) {
    errors['participant.emergencyContact.phone'] = '紧急联系人手机号格式不正确';
  }

  return errors;
}
