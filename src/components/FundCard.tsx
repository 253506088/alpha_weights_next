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
            <div className="card-body">
                {/* 左侧：净值信息两行 */}
                {fund.dwjz && (
                    <div className="nav-info-left">
                        <div className="nav-row">昨日净值: {fund.dwjz.toFixed(4)}</div>
                        <div className={`nav-row ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
                            预估净值: {fund.estimatedNav?.toFixed(4) || '--'}
                        </div>
                    </div>
                )}

                {/* 右侧：预估涨跌幅 */}
                <div className={`value ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
                    {percentStr}%
                    <small>预估</small>
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
