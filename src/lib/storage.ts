import LZString from 'lz-string';
import { FundHolding } from './api/fund';

export interface StoredFund {
    code: string;
    name: string;
    holdings: FundHolding[];
    lastUpdate: number; // timestamp
    dwjz?: number; // 昨日净值
    stockRatio?: number; // 股票仓位 (0-100)，默认 95
}

export interface AppConfig {
    refreshInterval: number; // in seconds
}

export interface FundHistoryItem {
    timestamp: number;
    estimatedChange: number;
    holdingsSnapshot?: {
        code: string;
        name?: string; // Optional to save space
        ratio: number;
        percent: number;
        price: number;
    }[];
}

const KEYS = {
    FUNDS: 'alpha_weights_funds',
    CONFIG: 'alpha_weights_config',
    HISTORY_PREFIX: 'alpha_weights_history_'
};

// ==================== 压缩工具函数 ====================

// 短 key 映射表
const KEY_MAP: Record<string, string> = {
    code: 'c',
    name: 'n',
    holdings: 'h',
    lastUpdate: 'lu',
    dwjz: 'd',
    stockRatio: 'sr',
    ratio: 'r',
    percent: 'p',
    price: 'pr',
    timestamp: 't',
    estimatedChange: 'e',
    holdingsSnapshot: 'hs'
};

// 反向映射表
const REVERSE_KEY_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(KEY_MAP).map(([k, v]) => [v, k])
);

// 判断是否为压缩格式（未压缩的 JSON 以 [ 或 { 开头）
const isCompressed = (str: string): boolean => {
    return !str.startsWith('[') && !str.startsWith('{');
};

// 递归短化 key
const shortenKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(shortenKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
            const shortKey = KEY_MAP[key] || key;
            result[shortKey] = shortenKeys(obj[key]);
        }
        return result;
    }
    return obj;
};

// 递归还原 key
const expandKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(expandKeys);
    }
    if (obj !== null && typeof obj === 'object') {
        const result: any = {};
        for (const key of Object.keys(obj)) {
            const fullKey = REVERSE_KEY_MAP[key] || key;
            result[fullKey] = expandKeys(obj[key]);
        }
        return result;
    }
    return obj;
};

// 判断是否为短 key 格式
const isShortKeyFormat = (obj: any): boolean => {
    if (Array.isArray(obj) && obj.length > 0) {
        return obj[0].c !== undefined || obj[0].t !== undefined;
    }
    return obj && (obj.c !== undefined || obj.t !== undefined);
};

// 压缩保存
const compressSave = (key: string, data: any): void => {
    const shortened = shortenKeys(data);
    const jsonStr = JSON.stringify(shortened);
    const compressed = LZString.compressToUTF16(jsonStr);
    localStorage.setItem(key, compressed);
};

// 解压读取
const decompressLoad = <T>(key: string, defaultValue: T): T => {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;

    try {
        let parsed: any;

        if (isCompressed(raw)) {
            // 新格式：压缩数据
            const decompressed = LZString.decompressFromUTF16(raw);
            if (!decompressed) {
                console.error(`解压失败: ${key}`);
                return defaultValue;
            }
            parsed = JSON.parse(decompressed);
        } else {
            // 旧格式：未压缩 JSON
            parsed = JSON.parse(raw);
        }

        // 检查是否需要还原 key
        if (isShortKeyFormat(parsed)) {
            return expandKeys(parsed) as T;
        }
        return parsed as T;
    } catch (e) {
        console.error(`读取 ${key} 失败:`, e);
        return defaultValue;
    }
};

// 清理所有 history 数据以释放空间
const clearAllHistory = (): void => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(KEYS.HISTORY_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`已清理 ${keysToRemove.length} 个 history 存储项`);
};

// 检测并迁移旧数据
let migrationDone = false;
const checkAndMigrateData = (): void => {
    if (migrationDone || typeof window === 'undefined') return;
    migrationDone = true;

    const raw = localStorage.getItem(KEYS.FUNDS);
    if (!raw) return;

    // 如果是旧格式（未压缩），执行迁移
    if (!isCompressed(raw)) {
        console.log('检测到旧格式数据，开始迁移...');

        // 清理所有 history 数据释放空间
        clearAllHistory();

        // 读取旧数据
        try {
            const oldData = JSON.parse(raw) as StoredFund[];

            // 以新格式保存
            compressSave(KEYS.FUNDS, oldData);
            console.log('数据迁移完成');
        } catch (e) {
            console.error('迁移失败:', e);
        }
    }
};

// ==================== StorageManager ====================

export const StorageManager = {
    // Funds
    getFunds: (): StoredFund[] => {
        if (typeof window === 'undefined') return [];
        checkAndMigrateData();
        return decompressLoad<StoredFund[]>(KEYS.FUNDS, []);
    },

    saveFunds: (funds: StoredFund[]) => {
        if (typeof window === 'undefined') return;
        try {
            compressSave(KEYS.FUNDS, funds);
        } catch (e) {
            console.error('保存 funds 失败，尝试清理空间...', e);
            // 清理 history 释放空间后重试
            clearAllHistory();
            try {
                compressSave(KEYS.FUNDS, funds);
                console.log('清理后保存成功');
            } catch (e2) {
                console.error('清理后仍然保存失败:', e2);
            }
        }
    },

    // Config
    getConfig: (): AppConfig => {
        if (typeof window === 'undefined') return { refreshInterval: 60 };
        return decompressLoad<AppConfig>(KEYS.CONFIG, { refreshInterval: 60 });
    },

    saveConfig: (config: AppConfig) => {
        if (typeof window === 'undefined') return;
        try {
            compressSave(KEYS.CONFIG, config);
        } catch (e) {
            console.error('保存 config 失败:', e);
        }
    },

    // History（history 数据量大，单独处理）
    getFundHistory: (code: string): FundHistoryItem[] => {
        if (typeof window === 'undefined') return [];
        return decompressLoad<FundHistoryItem[]>(KEYS.HISTORY_PREFIX + code, []);
    },

    appendFundHistory: (code: string, estimate: number, holdingsSnapshot?: FundHistoryItem['holdingsSnapshot'], timestamp?: number) => {
        if (typeof window === 'undefined') return;

        const nowMs = timestamp || Date.now();
        const now = new Date(nowMs);
        const today = now.toDateString();

        // Get existing history
        const history = StorageManager.getFundHistory(code);

        // Filter for today only
        let cleanHistory = history.filter(h => new Date(h.timestamp).toDateString() === today);

        // Check if the last item is from the same minute
        const lastItem = cleanHistory[cleanHistory.length - 1];
        const isSameMinute = lastItem &&
            new Date(lastItem.timestamp).getMinutes() === now.getMinutes() &&
            new Date(lastItem.timestamp).getHours() === now.getHours();

        const newItem: FundHistoryItem = {
            timestamp: nowMs,
            estimatedChange: estimate,
            holdingsSnapshot
        };

        if (isSameMinute) {
            // Overwrite last item
            cleanHistory[cleanHistory.length - 1] = newItem;
        } else {
            // Append new item
            cleanHistory.push(newItem);
        }

        // 限制最大历史点数（减少到 200 以节省空间）
        if (cleanHistory.length > 200) {
            cleanHistory = cleanHistory.slice(cleanHistory.length - 200);
        }

        try {
            compressSave(KEYS.HISTORY_PREFIX + code, cleanHistory);
        } catch (e) {
            console.error("Quota Exceeded, clearing old history for " + code);
            // Emergency cleanup: keep only last 30
            const emergencyHistory = cleanHistory.slice(cleanHistory.length - 30);
            try {
                compressSave(KEYS.HISTORY_PREFIX + code, emergencyHistory);
            } catch (e2) {
                // 最后手段：直接删除这个 history
                localStorage.removeItem(KEYS.HISTORY_PREFIX + code);
                console.error("无法保存 history，已删除:", code);
            }
        }
    },

    // Export / Import
    exportData: (): string => {
        const funds = StorageManager.getFunds();
        const config = StorageManager.getConfig();

        const payload = { funds, config };
        try {
            return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        } catch (e) {
            console.error("Export failed", e);
            return "";
        }
    },

    importData: (base64Str: string): boolean => {
        try {
            const jsonStr = decodeURIComponent(escape(atob(base64Str)));
            const payload = JSON.parse(jsonStr);

            if (payload.funds && Array.isArray(payload.funds)) {
                StorageManager.saveFunds(payload.funds);
            }
            if (payload.config) {
                StorageManager.saveConfig(payload.config);
            }
            return true;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    }
};
