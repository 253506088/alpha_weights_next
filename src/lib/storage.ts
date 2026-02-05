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
        name: string;
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
        const history = StorageManager.getFundHistory(code);

        // Simple deduplication by minute: Check if last item is same minute
        const now = timestamp ? new Date(timestamp) : new Date();
        // ... (We could check against last item here to dedupe if needed, but for now simple append)

        const today = now.toDateString();
        const cleanHistory = history.filter(h => new Date(h.timestamp).toDateString() === today);

        // If explicitly setting 11:30 or 15:30, remove any existing entry for that exact minute to avoid duplicates?
        // Or just append. Chart usually handles it or we filter. 
        // Let's just append for now.

        cleanHistory.push({
            timestamp: timestamp || Date.now(),
            estimatedChange: estimate,
            holdingsSnapshot
        });

        localStorage.setItem(KEYS.HISTORY_PREFIX + code, JSON.stringify(cleanHistory));
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
