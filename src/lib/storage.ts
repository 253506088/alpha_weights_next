import { FundHolding } from './api/fund';

export interface StoredFund {
    code: string;
    name: string;
    holdings: FundHolding[];
    lastUpdate: number; // timestamp
    dwjz?: number; // 昨日净值
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

    appendFundHistory: (code: string, estimate: number, holdingsSnapshot?: FundHistoryItem['holdingsSnapshot']) => {
        if (typeof window === 'undefined') return;
        const history = StorageManager.getFundHistory(code);

        // Simple deduplication by minute: Check if last item is same minute
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes()}`;
        // We store full ISO, but checking against last item
        // Actually simpler: just append. UI can filter.
        // Or better: keep only today's data? 
        // Legacy app: "Auto complete at 15:00".
        // For now, simple append. 

        // Prune old data (keep only today?)
        // Let's keep 4 hours of data for now or just append.
        // To match legacy "Intraday", we should clear old data on new day.

        const today = now.toDateString();
        const cleanHistory = history.filter(h => new Date(h.timestamp).toDateString() === today);

        cleanHistory.push({
            timestamp: Date.now(),
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
