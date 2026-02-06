import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getXueqiuStockUrl(code: string): string {
  let symbol = code;
  // A股 6位代码规则
  if (/^\d{6}$/.test(code)) {
    if (code.startsWith('6') || code.startsWith('9')) {
      // 上海: 60xxxx, 688xxx, 900xxx(B股)
      symbol = `SH${code}`;
    } else if (code.startsWith('0') || code.startsWith('3') || code.startsWith('2')) {
      // 深圳: 00xxxx, 30xxxx, 20xxxx(B股)
      symbol = `SZ${code}`;
    } else if (code.startsWith('4') || code.startsWith('8')) {
      // 北交所: 8xxxxx, 4xxxxx
      symbol = `BJ${code}`;
    }
  }
  // 港股通常是 5位，美股是字母，雪球直接支持
  return `https://xueqiu.com/S/${symbol}`;
}
