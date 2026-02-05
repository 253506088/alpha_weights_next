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
    const [history, setHistory] = useState<FundHistoryItem[]>([]);

    useEffect(() => {
        // Load history
        const hist = StorageManager.getFundHistory(fund.code);
        setHistory(hist);
    }, [fund.code]);

    // Chart Option
    const chartOption = useMemo(() => {
        const data = history.map(h => {
            const d = new Date(h.timestamp);
            const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            return [timeStr, h.estimatedChange.toFixed(2)];
        });

        return {
            tooltip: {
                trigger: 'axis',
                formatter: function (params: any) {
                    const p = params[0];
                    return `${p.name}<br/>预估: <span style="color:${p.data[1] >= 0 ? '#ef4444' : '#10b981'}">${p.data[1]}%</span>`;
                }
            },
            grid: {
                top: 30, right: 20, bottom: 20, left: 40, containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.map(d => d[0]),
                axisLine: { lineStyle: { color: '#64748b' } },
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
                axisLabel: { color: '#94a3b8', formatter: '{value}%' }
            },
            series: [{
                data: data.map(d => d[1]),
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 2, color: '#38bdf8' },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(56, 189, 248, 0.3)' }, { offset: 1, color: 'rgba(56, 189, 248, 0)' }]
                    }
                }
            }]
        };
    }, [history]);

    // Sort holdings by ratio
    const sortedHoldings = [...fund.holdings].sort((a, b) => b.ratio - a.ratio);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-card w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-xl flex flex-col relative animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">{fund.name}</h2>
                        <p className="text-sm text-slate-400 font-mono">{fund.code} · {fund.estimate > 0 ? '+' : ''}{fund.estimate.toFixed(2)}%</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto flex flex-col lg:flex-row">

                    {/* Left: Chart */}
                    <div className="w-full lg:w-2/3 h-64 lg:h-auto min-h-[300px] p-4 border-b lg:border-b-0 lg:border-r border-slate-700/50">
                        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                    </div>

                    {/* Right: Holdings Table */}
                    <div className="w-full lg:w-1/3 bg-slate-900/30 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/80 sticky top-0 backdrop-blur-md z-10">
                                <tr>
                                    <th className="p-3 font-medium text-slate-400">股票</th>
                                    <th className="p-3 font-medium text-slate-400 text-right">占比</th>
                                    <th className="p-3 font-medium text-slate-400 text-right">现价/涨跌</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {sortedHoldings.map(h => {
                                    const stock = stockPrices[h.code];
                                    const change = stock ? stock.percent : 0;
                                    const price = stock ? stock.price : 0;
                                    const isUp = change > 0;
                                    const isDown = change < 0;

                                    return (
                                        <tr key={h.code} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-3">
                                                <div className="font-medium text-slate-200">{h.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{h.code}</div>
                                            </td>
                                            <td className="p-3 text-right text-slate-300">
                                                {(h.ratio * 100).toFixed(2)}%
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="font-mono text-slate-200">{price.toFixed(2)}</div>
                                                <div className={cn("font-mono text-xs", isUp ? "text-red-400" : isDown ? "text-emerald-400" : "text-slate-500")}>
                                                    {change > 0 ? '+' : ''}{change.toFixed(2)}%
                                                </div>
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
    );
}
