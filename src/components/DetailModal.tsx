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
        const data = history.map(h => {
            const d = new Date(h.timestamp);
            const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            return [timeStr, h.estimatedChange.toFixed(2)];
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
                        return `${p.name}<br/>预估涨跌: <span style="color:${p.data[1] >= 0 ? '#ef4444' : '#10b981'}">${p.data[1]}%</span>`;
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
                data: data.map(d => d[0]),
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
                data: data.map(d => d[1]),
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
        // If hovering and we have snapshot data
        if (hoveredIndex >= 0 && history[hoveredIndex]?.holdingsSnapshot) {
            return [...history[hoveredIndex].holdingsSnapshot!].sort((a, b) => b.ratio - a.ratio);
        }

        // Default: Live data
        return [...fund.holdings].map(h => {
            const stock = stockPrices[h.code];
            return {
                code: h.code,
                name: h.name,
                ratio: h.ratio,
                percent: stock ? stock.percent : 0,
                price: stock ? stock.price : 0
            };
        }).sort((a, b) => b.ratio - a.ratio);
    }, [fund.holdings, stockPrices, hoveredIndex, history]);

    return (
        <div className="modal-overlay active" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal modal-legacy">
                <div className="close-btn" onClick={onClose}>&times;</div>
                <h3 style={{ marginBottom: '20px' }}>
                    {fund.name} <span style={{ fontWeight: 'normal', color: 'var(--text-sub)', fontSize: '16px' }}>({fund.code})</span>
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
