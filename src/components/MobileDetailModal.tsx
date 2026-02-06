"use client";

import { FundWithEstimate, useFunds } from "@/hooks/use-funds";
import { StorageManager, FundHistoryItem } from "@/lib/storage";
import ReactECharts from 'echarts-for-react';
import { useEffect, useState, useMemo } from "react";
import { getXueqiuStockUrl } from "@/lib/utils";

interface MobileDetailModalProps {
    fund: FundWithEstimate;
    onClose: () => void;
}

export function MobileDetailModal({ fund, onClose }: MobileDetailModalProps) {
    const { stockPrices } = useFunds();
    const [history, setHistory] = useState<FundHistoryItem[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState<number>(-1);

    useEffect(() => {
        const hist = StorageManager.getFundHistory(fund.code);
        setHistory(hist);
    }, [fund.code]);

    // 图表配置
    const chartOption = useMemo(() => {
        // Calculate conversion factors for Correction line
        const totalRatio = fund.holdings.reduce((sum, h) => sum + h.ratio, 0);
        const stockRatio = (fund.stockRatio !== undefined && fund.stockRatio !== null) ? fund.stockRatio : 95;

        // Filter and map data
        const data = history
            .filter(h => {
                // Filter out 11:31 - 12:59 data points
                const d = new Date(h.timestamp);
                const t = d.getHours() * 100 + d.getMinutes();
                return !(t > 1130 && t < 1300);
            })
            .map(h => {
                const d = new Date(h.timestamp);
                const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

                // Calculate correction for this point
                let correction = 0;
                if (totalRatio > 0) {
                    correction = (h.estimatedChange / totalRatio) * (stockRatio / 100);
                }

                return {
                    name: timeStr,
                    value: [timeStr, h.estimatedChange.toFixed(2)],
                    correction: [timeStr, correction.toFixed(2)] // Correction
                };
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
                        const p0 = params[0]; // Estimate
                        const p1 = params[1]; // Correction

                        let html = `${p0.name}<br/>`;
                        if (p0) {
                            const val = parseFloat(p0.value[1]);
                            html += `预估: <span style="color:${val >= 0 ? '#ef4444' : '#10b981'}">${p0.value[1]}%</span><br/>`;
                        }
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
                top: 30, bottom: 25, left: 45, right: 15
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.map(d => d.name),
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
                axisLabel: { color: '#94a3b8', fontSize: 10 }
            },
            yAxis: {
                type: 'value',
                scale: true,
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#94a3b8', formatter: '{value}%', fontSize: 10 }
            },
            series: [
                {
                    name: '预估',
                    data: data.map(d => d.value),
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: { width: 1.5, color: '#888' }, // Gray for Estimate
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
                    lineStyle: { width: 2, color: '#ff5e3a' }, // Orange for Correction
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

    // 持仓数据
    const displayHoldings = useMemo(() => {
        let rawList;
        // If hovering and we have snapshot data
        if (hoveredIndex >= 0 && history[hoveredIndex]?.holdingsSnapshot) {
            // Restore name from fund.holdings since we don't store it in history anymore
            rawList = history[hoveredIndex].holdingsSnapshot!.map(s => {
                const holding = fund.holdings.find(fh => fh.code === s.code);
                return {
                    ...s,
                    name: holding ? holding.name : (s.name || s.code)
                };
            });
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

        // Deduplicate
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

    // Props for editing
    const { updateStockRatio } = useFunds();
    const stockRatio = (fund.stockRatio !== undefined && fund.stockRatio !== null) ? fund.stockRatio : 95;

    const isUp = fund.estimate > 0;
    const isDown = fund.estimate < 0;

    return (
        <div className="mobile-modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="mobile-modal mobile-detail-modal">
                <div className="mobile-modal-header">
                    <div className="mobile-detail-title">
                        <h3>
                            <a href={`https://xueqiu.com/S/F${fund.code}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                {fund.name}
                            </a>
                        </h3>
                        <span className="mobile-detail-code">{fund.code}</span>
                    </div>
                    <button className="mobile-modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="mobile-modal-content">
                    {/* 预估涨跌 - 手机版主要展示大数，这里保持原样还是改双列？用户说header改，手机版布局不同 */}
                    {/* 手机版上面是涨跌幅大字，下面才是净值行。 */}
                    {/* 既然要改header内容，手机版的"nav rows"在下面 */}

                    <div className="mobile-detail-estimate" style={{ display: 'flex', justifyContent: 'space-around' }}>
                        <div>
                            <div className={`mobile-detail-value ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
                                {fund.estimate > 0 ? '+' : ''}{fund.estimate.toFixed(2)}%
                            </div>
                            <div className="mobile-detail-label">预估涨跌</div>
                        </div>
                        <div>
                            <div className={`mobile-detail-value ${fund.correction > 0 ? 'up' : fund.correction < 0 ? 'down' : 'neutral'}`}>
                                {(fund.correction > 0 ? "+" : "") + fund.correction.toFixed(2)}%
                            </div>
                            <div className="mobile-detail-label">修正涨跌</div>
                        </div>
                    </div>

                    {fund.dwjz && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                            padding: '0 15px 10px 15px',
                            color: 'var(--text-sub)',
                            fontSize: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#e2e8f0' }}>昨日: {fund.dwjz.toFixed(4)}</span>
                                <span style={{ color: '#888' }}>预估: {fund.estimatedNav?.toFixed(4)} ({fund.estimate > 0 ? '+' : ''}{fund.estimate.toFixed(2)}%)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span onClick={() => {
                                    const val = prompt("请输入股票总仓位百分比 (例如 95):", stockRatio.toString());
                                    if (val) {
                                        const num = parseFloat(val);
                                        if (!isNaN(num) && num > 0 && num <= 100) {
                                            updateStockRatio(fund.code, num);
                                        }
                                    }
                                }} style={{ textDecoration: 'underline', cursor: 'pointer' }}>仓位: {stockRatio}%</span>
                                <span style={{ color: '#ff5e3a', fontWeight: 'bold' }}>修正: {fund.correctionNav?.toFixed(4)} ({(fund.correction > 0 ? "+" : "") + fund.correction.toFixed(2)}%)</span>
                            </div>
                        </div>
                    )}

                    {/* 图表 */}
                    <div className="mobile-detail-chart">
                        <ReactECharts
                            option={chartOption}
                            style={{ height: '180px', width: '100%' }}
                            onEvents={onChartEvents}
                        />
                    </div>
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--text-sub)',
                        fontSize: '10px',
                        marginTop: '-10px',
                        marginBottom: '10px'
                    }}>
                        {new Date().toLocaleDateString()}
                    </div>

                    {/* 持仓列表 */}
                    <div className="mobile-detail-holdings">
                        <h4>前十大重仓股</h4>
                        <div className="mobile-holdings-list">
                            <div className="mobile-holding-header">
                                <div className="mobile-header-item" style={{ flex: 1 }}>股票</div>
                                <div className="mobile-header-item" style={{ width: '50px', textAlign: 'right' }}>占比</div>
                                <div className="mobile-header-item" style={{ width: '60px', textAlign: 'right' }}>涨跌</div>
                                <div className="mobile-header-item" style={{ width: '60px', textAlign: 'right' }}>贡献</div>
                            </div>
                            {displayHoldings.map(h => {
                                const hIsUp = h.percent > 0;
                                const hIsDown = h.percent < 0;
                                const contribution = h.ratio * h.percent;
                                const cIsUp = contribution > 0;
                                const cIsDown = contribution < 0;
                                return (
                                    <div key={h.code} className="mobile-holding-item">
                                        <div className="mobile-holding-name">
                                            <a href={getXueqiuStockUrl(h.code)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                {h.name}
                                            </a>
                                        </div>
                                        <div className="mobile-holding-ratio">{(h.ratio * 100).toFixed(2)}%</div>
                                        <div className={`mobile-holding-percent ${hIsUp ? 'up' : hIsDown ? 'down' : 'neutral'}`}>
                                            {h.percent > 0 ? '+' : ''}{h.percent.toFixed(2)}%
                                        </div>
                                        <div className={`mobile-holding-contribution ${cIsUp ? 'up' : cIsDown ? 'down' : 'neutral'}`}>
                                            {contribution > 0 ? '+' : ''}{contribution.toFixed(2)}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {displayHoldings.length > 0 && (
                            <div style={{
                                display: 'flex',
                                padding: '10px 12px',
                                borderTop: '1px solid rgba(255,255,255,0.05)',
                                color: '#ff5e3a',
                                fontWeight: 500,
                                fontSize: '13px'
                            }}>
                                <div style={{ flex: 1, textAlign: 'right', paddingRight: '10px', color: 'var(--text-sub)' }}>前十持仓合计</div>
                                <div style={{ width: '50px', textAlign: 'right' }}>
                                    {(displayHoldings.reduce((sum, h) => sum + h.ratio, 0) * 100).toFixed(2)}%
                                </div>
                                <div style={{ width: '60px' }}></div>
                                <div style={{ width: '60px' }}></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

    );
}
