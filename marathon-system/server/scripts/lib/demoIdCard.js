/**
 * 仅供演示数据与测试使用的身份证号生成器。
 * 结构：6 位行政区划 + 8 位出生日期 + 3 位顺序码（第 17 位奇数为男、偶数为女）+ 1 位校验码。
 */
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

export function makeDemoIdCard({ areaCode, birthDate, sequence = '001', gender = 'male' }) {
  const birth = String(birthDate).replace(/-/g, '');
  if (!/^\d{6}$/.test(areaCode)) throw new Error('areaCode 必须是 6 位数字');
  if (!/^\d{8}$/.test(birth)) throw new Error('birthDate 必须是 YYYY-MM-DD');
  if (!/^\d{3}$/.test(sequence)) throw new Error('sequence 必须是 3 位数字');

  const genderDigit = gender === 'male' ? '1' : '2';
  // 前 17 位：6 + 8 + 3，其中顺序码最后一位决定性别
  const body = `${areaCode}${birth}${sequence.slice(0, 2)}${genderDigit}`;
  const sum = WEIGHTS.reduce((total, weight, index) => total + weight * Number(body[index]), 0);
  return `${body}${CHECK_CODES[sum % 11]}`;
}
