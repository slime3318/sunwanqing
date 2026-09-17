/**
 * 转义用户输入，避免拼接进 RegExp 时被当作元字符（正则注入）。
 */
export function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildCaseInsensitiveRegex(value) {
  return new RegExp(escapeRegex(value), 'i');
}
