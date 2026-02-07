// verify-holiday-logic.js
// Run with: npx ts-node verify-holiday-logic.js (if ts-node available) OR 
// since we don't have ts-node environment setup easily, I'll make this a pure JS script 
// that mimics the Logic of HolidayManager to verify the LOGIC itself. 
// OR better: I can import the HolidayManager if I compile it. 
// Simplest: I will copy the `isTradingDay` logic into this script to verify the ALGORITHM.

const STORAGE_KEY_PREFIX = "holiday_";

// Mock LocalStorage
const mockStorage = {};
const localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => mockStorage[key] = val,
    removeItem: (key) => delete mockStorage[key]
};

// --- Copy of Logic from HolidayManager ---
function isTradingDay(date) {
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay(); // 0: Sun, 6: Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // A-share Rule 1: Weekends are ALWAYS closed
    if (isWeekend) return false;

    // Check cache for Holidays
    const key = getMonthKey(date);
    const cacheStr = localStorage.getItem(key);
    let holidayInfo = null;

    if (cacheStr) {
        try {
            const cache = JSON.parse(cacheStr);
            holidayInfo = cache[dateStr];
        } catch (e) {
            console.error("Cache parse error", e);
        }
    }

    // A-share Rule 2: If it's a weekday (Mon-Fri), check if it's a Holiday.
    if (holidayInfo) {
        if (holidayInfo.holiday) {
            return false; // It is a holiday -> Closed
        }
    }

    // Default: Open (Workday Mon-Fri)
    return true;
}

function getMonthKey(date) {
    return `${STORAGE_KEY_PREFIX}${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- Test Setup ---

// Setup Mock Data
// Feb 2026
// 2026-02-17 (Tue): Chinese New Year (Holiday)
// 2026-02-21 (Sat): Normal Weekend
// 2026-02-15 (Sun): Make-up Workday (Work on Sunday to make up for holiday? Wait, 2026 CNY is Feb 17. 
// Let's assume a hypothetical Make-up day on a Saturday.
// Actually, let's use recent data or just mock specific scenarios.

// Scenario A: 2026-02-17 is a Holiday (WeekDay)
const keyFeb2026 = "holiday_2026-02";
const feb2026Data = {
    "2026-02-17": { date: "2026-02-17", holiday: true, name: "Spring Festival", wage: 3, rest: 1 }
};
localStorage.setItem(keyFeb2026, JSON.stringify(feb2026Data));

// Scenario B: Make-up day on Weekend (Hypothetical)
// Suppose 2026-02-28 (Sat) is a make-up day (holiday: false)
const feb2026Data_Updated = {
    ...feb2026Data,
    "2026-02-28": { date: "2026-02-28", holiday: false, name: "Special Workday", wage: 1, rest: 0 }
};
localStorage.setItem(keyFeb2026, JSON.stringify(feb2026Data_Updated));


// --- Tests ---

function test(dateStr, expected, desc) {
    const date = new Date(dateStr);
    const result = isTradingDay(date);
    const pass = result === expected;
    console.log(`${pass ? "✅ PASS" : "❌ FAIL"}: ${desc} (${dateStr}) -> Expected ${expected}, Got ${result}`);
}

console.log("Starting Verification...");

// 1. Normal Workday (Mon)
test("2026-02-16", true, "Normal Monday should be Open");

// 2. Holiday (Tue)
test("2026-02-17", false, "Holiday Tuesday should be Closed");

// 3. Normal Weekend (Sat)
test("2026-02-21", false, "Normal Saturday should be Closed");

// 4. Make-up Workday on Weekend (Sat) -> A-share Rule: STILL CLOSED
test("2026-02-28", false, "Make-up Saturday should be Closed (A-share rule)");

// 5. Normal Workday with No Cache Entry (Wed)
test("2026-02-18", true, "Normal Wednesday (no cache entry) should be Open");

console.log("Verification Complete.");
