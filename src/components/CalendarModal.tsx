import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { HolidayManager } from "@/lib/api/holiday";

interface CalendarModalProps {
    onClose: () => void;
}

export function CalendarModal({ onClose }: CalendarModalProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    // Force re-render to update calendar status
    const [_, setTick] = useState(0);

    useEffect(() => {
        console.log("CalendarModal mounted");
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await HolidayManager.checkAndCacheHolidays();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setTick(t => t + 1);
        }
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-11

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const renderDays = () => {
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const isToday = new Date().toDateString() === date.toDateString();
            const isTrading = HolidayManager.isTradingDay(date);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // 判断日期状态
            // 使用内联样式确保颜色正确覆盖
            let dayStyle: { color: string; fontWeight?: string } = { color: 'rgba(255,255,255,0.8)' }; // 默认交易日
            let dayClasses = "bg-white/5";

            const isWeekendMakeup = HolidayManager.isWeekendMakeup(date);

            if (!isTrading) {
                if (isWeekendMakeup) {
                    // 周末调休上班（官方上班但A股不开盘）- 橙色
                    dayStyle = { color: '#f97316' }; // orange-500
                    dayClasses = "bg-orange-500/10 font-bold";
                } else if (isWeekend) {
                    // 普通周末 - 蓝色
                    dayStyle = { color: '#60a5fa' }; // blue-400
                    dayClasses = "bg-blue-400/10 font-bold";
                } else {
                    // 节假日 - 红色
                    dayStyle = { color: '#ef4444' }; // red-500
                    dayClasses = "bg-red-500/10 font-bold";
                }
            } else {
                // 交易日
                dayClasses = "bg-white/5";
            }

            if (isToday) {
                // Remove border box, just use a distinct background/shadow/text
                dayClasses += " shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]";
                dayStyle = { ...dayStyle, color: 'var(--accent)', fontWeight: 'bold' };
            }

            days.push(
                <div key={d} className={`calendar-day ${dayClasses}`} style={dayStyle}>
                    <span className="day-number">{d}</span>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="mobile-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="mobile-modal mobile-detail-modal" onClick={e => e.stopPropagation()} style={{ height: 'auto', maxHeight: '80vh' }}>
                <div className="mobile-modal-header">
                    <div className="mobile-detail-title">
                        <h3>交易日历</h3>
                    </div>
                    <button className="mobile-modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="mobile-modal-content" style={{ padding: '20px' }}>
                    <div className="calendar-controls">
                        <button onClick={prevMonth} className="cal-btn"><ChevronLeft size={20} /></button>
                        <span className="cal-title">{year}年 {month + 1}月</span>
                        <button onClick={nextMonth} className="cal-btn"><ChevronRight size={20} /></button>
                    </div>

                    {loading ? (
                        <div className="calendar-loading">
                            <Loader2 className="animate-spin" /> 加载中...
                        </div>
                    ) : (
                        <div className="calendar-grid">
                            <div className="week-header">日</div>
                            <div className="week-header">一</div>
                            <div className="week-header">二</div>
                            <div className="week-header">三</div>
                            <div className="week-header">四</div>
                            <div className="week-header">五</div>
                            <div className="week-header">六</div>
                            {renderDays()}
                        </div>
                    )}

                    <div className="calendar-legend">
                        <div className="legend-item"><span className="dot trading"></span> 交易日</div>
                        <div className="legend-item"><span className="dot weekend"></span> 周末</div>
                        <div className="legend-item"><span className="dot makeup"></span> 调休上班</div>
                        <div className="legend-item"><span className="dot holiday"></span> 节假日</div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                /* Keep the custom internal styles for calendar grid */
                .calendar-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding: 10px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                }
                .cal-title {
                    font-size: 1.2rem;
                    font-weight: bold;
                    color: var(--text-main);
                }
                .cal-btn {
                    padding: 8px;
                    color: var(--text-main);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 8px;
                    text-align: center;
                }
                .week-header {
                    font-size: 0.9rem;
                    color: var(--text-sub);
                    padding-bottom: 10px;
                }
                .calendar-day {
                    aspect-ratio: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    position: relative;
                    font-size: 1rem;
                }
                .calendar-day.empty {
                    background: transparent;
                }
                .day-status {
                    font-size: 0.6rem;
                    margin-top: 2px;
                    height: 12px; 
                    display: none; /* Hide if element exists */
                }
                .calendar-legend {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 20px;
                    font-size: 0.8rem;
                    color: var(--text-sub);
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .dot.trading { background: var(--text-main); }
                .dot.weekend { background: #60a5fa; }
                .dot.makeup { background: #f97316; }
                .dot.holiday { background: #ef4444; }
                .calendar-loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 200px;
                    gap: 10px;
                    color: var(--text-sub);
                }
            `}</style>
        </div>
    );
}
