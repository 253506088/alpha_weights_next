"use client";

import { FundWithEstimate } from "@/hooks/use-funds";
import { StorageManager, FundHistoryItem } from "@/lib/storage";
import { useFunds } from "@/hooks/use-funds"; // To get latest stock prices
import { X } from "lucide-react";
import ReactECharts from 'echarts-for-react';
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface DetailModalProps {
    fund: FundWithEstimate;
    onClose: () => void;
}

export function DetailModal({ fund, onClose }: DetailModalProps) {
    const { stockPrices } = useFunds();
    const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
    const [history, setHistory] = useState<FundHistoryItem[]>([]);

    useEffect(() => {
        // Load history
        const hist = StorageManager.getFundHistory(fund.code);
        setHistory(hist);
    }, [fund.code]);

    // Chart Option matching legacy (Orange)
    const chartOption = useMemo(() => {
        // Filter and map data
        const data = history
            .filter(h => {
                // Filter out 11:31 - 12:59 data points (legacy or accidental)
                const d = new Date(h.timestamp);
                const t = d.getHours() * 100 + d.getMinutes();
                return !(t > 1130 && t < 1300);
            })
            .map(h => {
                const d = new Date(h.timestamp);
                // Format HH:MM
                const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                return {
                    name: timeStr,
                    value: [timeStr, h.estimatedChange.toFixed(2)] // [Time, Value]
                };
            });

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(5, 5, 10, 0.9)',
                borderColor: '#333',
                textStyle: { color: '#fff' },
                formatter: function (params: any) {
                    if (params.length > 0) {
                        const p = params[0];
                        const val = parseFloat(p.value);
                        return `${p.name}<br/>预估涨跌: <span style="color:${val >= 0 ? '#ef4444' : '#10b981'}">${p.value}%</span>`;
                    }
                    return '';
                }
            },
            grid: {
                top: 40, bottom: 30, left: 50, right: 30,
                borderColor: 'rgba(255,255,255,0.1)'
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.map(d => d.name),
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: {
                type: 'value',
                scale: true,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#94a3b8', formatter: '{value}%' }
            },
            series: [{
                data: data.map(d => d.value[1]), // Value is [time, val], we want val. Or just use value mapping? ECharts handles arrays better if type is 'time'? 
                // But xAxis is category. So we just need the Y values.
                type: 'line',
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 3, color: '#ff5e3a' }, // Orange
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(255, 94, 58, 0.2)' },
                            { offset: 1, color: 'rgba(255, 94, 58, 0)' }
                        ]
                    }
                }
            }]
        };
    }, [history]);

    // Handle Chart Events
    const onChartEvents = {
        'updateAxisPointer': (event: any) => {
            if (event.dataIndex != null) {
                setHoveredIndex(event.dataIndex);
            }
        },
        'mouseout': () => {
            // setHoveredIndex(-1); // Optional: keep last selection or reset? Legacy likely keeps it or resets.
            // User said "Selecting a node...", implies it stays or helps to see specific time.
            // Usually resetting is better UX unless clicked. But let's follow standard ECharts behavior.
            // To match user description "Select", we might need click? Use updateAxisPointer is continuous.
        }
    };

    // Determine current holdings to display
    const displayHoldings = useMemo(() => {
        let rawList;
        // If hovering and we have snapshot data
        if (hoveredIndex >= 0 && history[hoveredIndex]?.holdingsSnapshot) {
            rawList = [...history[hoveredIndex].holdingsSnapshot!];
        } else {
            // Default: Live data
            rawList = [...fund.holdings].map(h => {
                const stock = stockPrices[h.code];
                return {
                    code: h.code,
                    name: h.name,
                    ratio: h.ratio,
                    percent: stock ? stock.percent : 0,
                    price: stock ? stock.price : 0
                };
            });
        }

        // Deduplicate list by code just in case data source has dups
        const seen = new Set<string>();
        const uniqueList = [];
        for (const item of rawList) {
            if (!seen.has(item.code)) {
                seen.add(item.code);
                uniqueList.push(item);
            }
        }

        return uniqueList.sort((a, b) => b.ratio - a.ratio);
    }, [fund.holdings, stockPrices, hoveredIndex, history]);

    return (
        <div className="modal-overlay active" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal modal-legacy">
                <div className="close-btn" onClick={onClose}>&times;</div>
                <h3 style={{ marginBottom: '20px' }}>
                    {fund.name} <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '16px' }}>({fund.code})</span>
                    {fund.dwjz && (
                        <span style={{ marginLeft: '20px', fontSize: '14px', color: '#ff5e3a' }}>
                            昨日净值: {fund.dwjz.toFixed(4)} &nbsp;&nbsp;
                            预估净值: {fund.estimatedNav?.toFixed(4) || '--'}
                        </span>
                    )}
                </h3>

                <div className="modal-body">
                    <div className="modal-left">
                        <div id="chart">
                            <ReactECharts
                                option={chartOption}
                                style={{ height: '400px', width: '100%' }}
                                onEvents={onChartEvents}
                            />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '10px', color: 'var(--text-sub)', fontSize: '12px' }}>
                            当前日期: {new Date().toLocaleDateString()}
                        </div>
                    </div>

                    <div className="modal-right">
                        <div className="detail-table-container">
                            <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-sub)', fontWeight: 500 }}>
                                持仓详情
                                <span style={{ fontWeight: 'normal', fontSize: '12px', opacity: 0.7 }}>
                                    {hoveredIndex >= 0 && history[hoveredIndex] ? new Date(history[hoveredIndex].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                            </h4>
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>股票</th>
                                        <th>占比</th>
                                        <th>涨跌</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayHoldings.map(h => {
                                        const isUp = h.percent > 0;
                                        const isDown = h.percent < 0;

                                        return (
                                            <tr key={h.code}>
                                                <td>{h.name}</td>
                                                <td>{(h.ratio * 100).toFixed(2)}%</td>
                                                <td className={isUp ? 'up' : isDown ? 'down' : 'neutral'}>
                                                    {h.percent > 0 ? '+' : ''}{h.percent.toFixed(2)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {displayHoldings.length > 0 && (
                                <div style={{
                                    padding: '10px',
                                    textAlign: 'right',
                                    color: '#ff5e3a',
                                    fontWeight: 500,
                                    borderTop: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    总占比: {(displayHoldings.reduce((sum, h) => sum + h.ratio, 0) * 100).toFixed(2)}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
