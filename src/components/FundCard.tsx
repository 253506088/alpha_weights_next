"use client";

import { FundWithEstimate } from "@/hooks/use-funds";
import { cn } from "@/lib/utils";

interface FundCardProps {
    fund: FundWithEstimate;
    onRemove: (code: string) => void;
    onUpdate: (code: string) => void;
    onClick: (fund: FundWithEstimate) => void;
}

export function FundCard({ fund, onRemove, onUpdate, onClick }: FundCardProps) {
    const isUp = fund.estimate > 0;
    const isDown = fund.estimate < 0;
    // Legacy logic: >0 is up (red), <0 is down (green)

    const percentStr = (fund.estimate > 0 ? "+" : "") + fund.estimate.toFixed(2); // No % here, it's in the DOM structure? No, legacy puts % outside in logic?
    // Checking legacy logic: `[[ formatNumber(fund.est_change) ]]%`
    // And formatNumber adds + but NOT %. So my percentStr logic is slightly diff.
    // Legacy: `(val > 0 ? '+' : '') + val.toFixed(2)` THEN `%` is outside.

    const totalRatio = fund.holdings.reduce((sum, h) => sum + h.ratio, 0) * 100;

    return (
        <div className="fund-card" onClick={() => onClick(fund)}>
            <div className="card-header">
                <div>
                    <div className="name" title={fund.name}>{fund.name}</div>
                    <div className="code">
                        {fund.code}
                        <button
                            className="icon-btn"
                            onClick={(e) => { e.stopPropagation(); onUpdate(fund.code); }}
                            title="重新获取持仓数据"
                        >
                            更新持仓
                        </button>
                    </div>
                </div>
                <button
                    className="delete-btn"
                    onClick={(e) => { e.stopPropagation(); onRemove(fund.code); }}
                    title="删除基金"
                >
                    &times;
                </button>
            </div>
            {/* 主体区域：左侧净值信息，右侧预估涨跌幅 */}
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {/* 左侧：净值信息三行 */}
                <div className="nav-info-left" style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                    {fund.dwjz && <div className="nav-row" style={{ fontSize: '0.8rem', color: '#888' }}>昨日: {fund.dwjz.toFixed(4)}</div>}
                    <div className={`nav-row ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`} style={{ fontSize: '0.85rem' }}>
                        预估: {fund.estimatedNav?.toFixed(4) || '--'}
                    </div>
                    <div className={`nav-row ${fund.correction > 0 ? 'up' : fund.correction < 0 ? 'down' : 'neutral'}`} style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                        修正: {fund.correctionNav?.toFixed(4) || '--'}
                    </div>
                </div>

                {/* 右侧：预估涨跌幅 & 修正涨跌幅 */}
                <div className="value-column" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <div className={`value-sm ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`} style={{ fontSize: '0.9rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#888', marginRight: '4px' }}>预</span>
                        {(fund.estimate > 0 ? "+" : "") + fund.estimate.toFixed(2)}%
                    </div>
                    <div className={`value-lg ${fund.correction > 0 ? 'up' : fund.correction < 0 ? 'down' : 'neutral'}`} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                        <span style={{ fontSize: '0.7rem', color: '#888', marginRight: '4px' }}>修</span>
                        {(fund.correction > 0 ? "+" : "") + fund.correction.toFixed(2)}%
                    </div>
                </div>
            </div>

            <div className="card-footer">
                <div className="total-ratio" title="前十持仓占比">
                    前十仓位: {totalRatio.toFixed(2)}%
                </div>
                <div className="time">更新于: {fund.lastPriceTime || '--:--'}</div>
            </div>
        </div>
    );
}
