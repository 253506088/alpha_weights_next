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
    const { stockPrices, updateStockRatio } = useFunds();
    const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
    const [history, setHistory] = useState<FundHistoryItem[]>([]);

    // Define stockRatio in scope
    const stockRatio = (fund.stockRatio !== undefined && fund.stockRatio !== null) ? fund.stockRatio : 95;

    useEffect(() => {
        // Load history
        const hist = StorageManager.getFundHistory(fund.code);
        setHistory(hist);
    }, [fund.code]);

    // Chart Option matching legacy (Orange)
    const chartOption = useMemo(() => {
        // Calculate conversion factors for Correction line
        const totalRatio = fund.holdings.reduce((sum, h) => sum + h.ratio, 0);
        // stockRatio is available in scope

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

                // Calculate correction for this point (using current weights approximation)
                let correction = 0;
                if (totalRatio > 0) {
                    correction = (h.estimatedChange / totalRatio) * (stockRatio / 100);
                }

                return {
                    name: timeStr,
                    value: [timeStr, h.estimatedChange.toFixed(2)], // Estimate
                    correction: [timeStr, correction.toFixed(2)] // Correction
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
                        const p0 = params[0]; // Estimate
                        const p1 = params[1]; // Correction (if exists)

                        let html = `${p0.name}<br/>`;

                        // Estimate
                        if (p0) {
                            const val = parseFloat(p0.value[1]);
                            html += `预估: <span style="color:${val >= 0 ? '#ef4444' : '#10b981'}">${p0.value[1]}%</span><br/>`;
                        }
                        // Correction
                        if (p1) {
                            const val = parseFloat(p1.value[1]);
                            html += `修正: <span style="color:${val >= 0 ? '#ef4444' : '#10b981'}">${p1.value[1]}%</span>`;
                        }

                        return html;
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
            series: [
                {
                    name: '预估',
                    data: data.map(d => d.value),
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 2, color: '#888' }, // Gray/Dim for Estimate
                    itemStyle: { color: '#888' },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(200, 200, 200, 0.1)' },
                                { offset: 1, color: 'rgba(200, 200, 200, 0)' }
                            ]
                        }
                    }
                },
                {
                    name: '修正',
                    data: data.map(d => d.correction),
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 3, color: '#ff5e3a' }, // Orange/Primary for Correction
                    itemStyle: { color: '#ff5e3a' },
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
                }
            ]
        };
    }, [history, fund]);

    // Handle Chart Events
    const onChartEvents = {
        'updateAxisPointer': (event: any) => {
            if (event.dataIndex != null) {
                setHoveredIndex(event.dataIndex);
            }
        },
        'mouseout': () => { }
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
                        <div style={{ marginTop: '5px', fontSize: '14px', display: 'flex', gap: '15px' }}>
                            <span style={{ color: '#e2e8f0' }}>昨日: {fund.dwjz.toFixed(4)}</span>
                            <span style={{ color: '#888' }}>预估: {fund.estimatedNav?.toFixed(4) || '--'} ({fund.estimate > 0 ? '+' : ''}{fund.estimate.toFixed(2)}%)</span>
                            <span style={{ color: '#ff5e3a', fontWeight: 'bold' }}>修正: {fund.correctionNav?.toFixed(4) || '--'} ({(fund.correction > 0 ? "+" : "") + fund.correction.toFixed(2)}%)</span>
                        </div>
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
                            <div style={{ marginTop: '5px', cursor: 'pointer' }} onClick={() => {
                                const val = prompt("请输入股票总仓位百分比 (例如 95):", stockRatio.toString());
                                if (val) {
                                    const num = parseFloat(val);
                                    if (!isNaN(num) && num > 0 && num <= 100) {
                                        updateStockRatio(fund.code, num);
                                    } else {
                                        alert("请输入有效的数值 (0-100)");
                                    }
                                }
                            }} title="点击修改股票总仓位">
                                股票总仓位: <span style={{ textDecoration: 'underline' }}>{stockRatio}%</span> (点击修改)
                            </div>
                        </div>
                    </div>

                    <div className="modal-right">
                        <div className="detail-table-container">
                            <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-sub)', fontWeight: 500 }}>
                                前十重仓股
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
        </div >
    );
}
