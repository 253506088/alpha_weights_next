import { log, logGroup } from "../logger";

interface HolidayInfo {
    date: string;
    holiday: boolean;
    name: string;
    wage: number;
    rest: number;
}

interface YearHolidays {
    [date: string]: HolidayInfo;
}

// Mirroring the structure from timor.tech/api/holiday/year/2026
interface ApiHolidayResponse {
    code: number;
    holiday: YearHolidays;
    type: any; // Ignoring detailed types map for now
}

const STORAGE_KEY_PREFIX = "holiday_";

export class HolidayManager {
    /**
     * 检查并缓存假日数据（按年度管理）
     * 1. 删除去年的缓存（腾空间）
     * 2. 检查本年度数据是否存在，不存在则获取
     */
    static async checkAndCacheHolidays() {
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const lastYear = currentYear - 1;

            // 1. 清理去年的缓存（删除所有 holiday_YYYY-MM 格式的去年数据）
            for (let month = 1; month <= 12; month++) {
                const oldKey = `${STORAGE_KEY_PREFIX}${lastYear}-${String(month).padStart(2, '0')}`;
                if (localStorage.getItem(oldKey)) {
                    localStorage.removeItem(oldKey);
                    log("HolidayManager", `已删除去年缓存: ${oldKey}`);
                }
            }

            // 2. 检查本年度数据是否存在（只检查一个月即可判断整年是否已缓存）
            const januaryKey = `${STORAGE_KEY_PREFIX}${currentYear}-01`;
            if (!localStorage.getItem(januaryKey)) {
                // 本年度数据不存在，获取
                await this.fetchAndCacheYear(currentYear);
            }
        } catch (e) {
            console.error("Holiday check failed", e);
            log("HolidayManager", `假日数据检查失败: ${e}`);
        }
    }

    private static getMonthKey(date: Date): string {
        return `${STORAGE_KEY_PREFIX}${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    private static async fetchAndCacheYear(year: number) {
        const url = `https://timor.tech/api/holiday/year/${year}`;
        log("HolidayManager", `Fetching holidays for ${year}...`);

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: ApiHolidayResponse = await res.json();

            if (data.code !== 0) {
                throw new Error(`API Error: ${JSON.stringify(data)}`);
            }

            const monthlyData: Record<string, any> = {};

            // Initialize 12 months
            for (let i = 1; i <= 12; i++) {
                const monthKey = `${STORAGE_KEY_PREFIX}${year}-${String(i).padStart(2, '0')}`;
                monthlyData[monthKey] = {};
            }

            // Distribute holidays
            Object.values(data.holiday).forEach(h => {
                const date = new Date(h.date);
                const monthKey = this.getMonthKey(date);
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey][h.date] = h;
                }
            });

            // Save to LocalStorage
            let saveCount = 0;
            for (const [key, value] of Object.entries(monthlyData)) {
                localStorage.setItem(key, JSON.stringify(value));
                saveCount++;
            }

            logGroup("HolidayManager", `Cached holidays for ${year}`, [
                `URL: ${url}`,
                `Months Cached: ${saveCount}`,
                `Sample Data (First 5):`,
                Object.values(data.holiday).slice(0, 5)
            ]);

        } catch (e) {
            log("HolidayManager", `Failed to fetch holidays for ${year}: ${e}`);
        }
    }

    /**
     * 判断是否是交易日
     * @param date Date 对象
     * @returns boolean
     */
    static isTradingDay(date: Date): boolean {
        const dateStr = this.formatDate(date);
        const dayOfWeek = date.getDay(); // 0: Sun, 6: Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // A股规则1：周末永远休市，即使是调休上班日
        if (isWeekend) return false;

        // 检查缓存中的假日信息
        const holidayInfo = this.getHolidayInfo(date);

        // A股规则2：工作日（周一到周五），检查是否是节假日
        if (holidayInfo && holidayInfo.holiday) {
            return false; // 是节假日 -> 休市
        }

        // 默认：开盘（周一到周五工作日）
        return true;
    }

    /**
     * 判断是否是周末调休（官方规定上班但A股不开盘）
     * 比如国庆后的周六调休上班，但A股依然休市
     * @param date Date 对象
     * @returns boolean
     */
    static isWeekendMakeup(date: Date): boolean {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (!isWeekend) return false; // 不是周末

        const holidayInfo = this.getHolidayInfo(date);

        // timor.tech API: holiday: false 表示调休上班日
        if (holidayInfo && holidayInfo.holiday === false) {
            return true; // 是周末调休上班日
        }

        return false; // 普通周末
    }

    /**
     * 获取某日的假日信息（内部方法）
     */
    private static getHolidayInfo(date: Date): HolidayInfo | null {
        const dateStr = this.formatDate(date);
        const key = this.getMonthKey(date);
        const cacheStr = localStorage.getItem(key);

        if (cacheStr) {
            try {
                const cache = JSON.parse(cacheStr);
                return cache[dateStr] || null;
            } catch (e) {
                console.error("Cache parse error", e);
            }
        }
        return null;
    }

    /**
     * Returns the last valid trading day before (or including) the referencing date.
     * @param validReferenceDate Usually today
     */
    static getLastTradingDay(validReferenceDate: Date = new Date()): Date {
        let d = new Date(validReferenceDate);

        // Loop backwards until we find a trading day
        // Safety break: 30 days
        for (let i = 0; i < 30; i++) {
            if (this.isTradingDay(d)) {
                return d;
            }
            d.setDate(d.getDate() - 1);
        }

        return d; // Fallback
    }

    private static formatDate(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
}
