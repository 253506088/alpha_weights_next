"use client";

import { FundWithEstimate, useFunds } from "@/hooks/use-funds";
import { StorageManager, FundHistoryItem } from "@/lib/storage";
import ReactECharts from 'echarts-for-react';
import { useEffect, useState, useMemo } from "react";

interface MobileDetailModalProps {
    fund: FundWithEstimate;
    onClose: () => void;
}

export function MobileDetailModal({ fund, onClose }: MobileDetailModalProps) {
    const { stockPrices } = useFunds();
    const [history, setHistory] = useState<FundHistoryItem[]>([]);

    useEffect(() => {
        const hist = StorageManager.getFundHistory(fund.code);
        setHistory(hist);
    }, [fund.code]);

    // 图表配置
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
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: function (params: any) {
                    if (params.length > 0) {
                        const p = params[0];
                        return `${p.name}<br/>预估: <span style="color:${p.data[1] >= 0 ? '#ef4444' : '#10b981'}">${p.data[1]}%</span>`;
                    }
                    return '';
                }
            },
            grid: {
                top: 30, bottom: 25, left: 45, right: 15
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.map(d => d[0]),
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
                axisLabel: { color: '#94a3b8', fontSize: 10 }
            },
            yAxis: {
                type: 'value',
                scale: true,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 }
            },
            series: [{
                data: data.map(d => d[1]),
                type: 'line',
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, color: '#ff5e3a' },
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

    // 持仓数据
    const displayHoldings = useMemo(() => {
        const rawList = [...fund.holdings].map(h => {
            const stock = stockPrices[h.code];
            return {
                code: h.code,
                name: h.name,
                ratio: h.ratio,
                percent: stock ? stock.percent : 0
            };
        });
        return rawList.sort((a, b) => b.ratio - a.ratio);
    }, [fund.holdings, stockPrices]);

    const isUp = fund.estimate > 0;
    const isDown = fund.estimate < 0;

    return (
        <div className="mobile-modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="mobile-modal mobile-detail-modal">
                <div className="mobile-modal-header">
                    <div className="mobile-detail-title">
                        <h3>{fund.name}</h3>
                        <span className="mobile-detail-code">{fund.code}</span>
                    </div>
                    <button className="mobile-modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="mobile-modal-content">
                    {/* 预估涨跌 */}
                    <div className="mobile-detail-estimate">
                        <div className={`mobile-detail-value ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
                            {fund.estimate > 0 ? '+' : ''}{fund.estimate.toFixed(2)}%
                        </div>
                        <div className="mobile-detail-label">预估涨跌</div>
                    </div>

                    {/* 图表 */}
                    <div className="mobile-detail-chart">
                        <ReactECharts
                            option={chartOption}
                            style={{ height: '180px', width: '100%' }}
                        />
                    </div>

                    {/* 持仓列表 */}
                    <div className="mobile-detail-holdings">
                        <h4>前十大重仓股</h4>
                        <div className="mobile-holdings-list">
                            {displayHoldings.map(h => {
                                const hIsUp = h.percent > 0;
                                const hIsDown = h.percent < 0;
                                return (
                                    <div key={h.code} className="mobile-holding-item">
                                        <div className="mobile-holding-name">{h.name}</div>
                                        <div className="mobile-holding-ratio">{(h.ratio * 100).toFixed(2)}%</div>
                                        <div className={`mobile-holding-percent ${hIsUp ? 'up' : hIsDown ? 'down' : 'neutral'}`}>
                                            {h.percent > 0 ? '+' : ''}{h.percent.toFixed(2)}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
