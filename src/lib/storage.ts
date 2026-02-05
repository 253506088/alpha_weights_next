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

export const StorageManager = {
    // Funds
    getFunds: (): StoredFund[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(KEYS.FUNDS);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    },

    saveFunds: (funds: StoredFund[]) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(KEYS.FUNDS, JSON.stringify(funds));
    },

    // Config
    getConfig: (): AppConfig => {
        if (typeof window === 'undefined') return { refreshInterval: 60 };
        try {
            const raw = localStorage.getItem(KEYS.CONFIG);
            return raw ? JSON.parse(raw) : { refreshInterval: 60 };
        } catch { return { refreshInterval: 60 }; }
    },

    saveConfig: (config: AppConfig) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
    },

    // History
    getFundHistory: (code: string): FundHistoryItem[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(KEYS.HISTORY_PREFIX + code);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
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

        // Limit maximum history points to avoid quota exceeded (e.g. 4 hours * 60 = 240 points ~ 250)
        // If > 300, start dropping every other point or just tail?
        // Let's just limit to last 300 points for safety
        if (cleanHistory.length > 300) {
            cleanHistory = cleanHistory.slice(cleanHistory.length - 300);
        }

        try {
            localStorage.setItem(KEYS.HISTORY_PREFIX + code, JSON.stringify(cleanHistory));
        } catch (e) {
            console.error("Quota Exceeded, clearing old history for " + code);
            // Emergency cleanup: keep only last 50
            const emergencyHistory = cleanHistory.slice(cleanHistory.length - 50);
            localStorage.setItem(KEYS.HISTORY_PREFIX + code, JSON.stringify(emergencyHistory));
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
