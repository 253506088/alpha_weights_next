"use client";

import { FundWithEstimate } from "@/hooks/use-funds";

interface MobileFundCardProps {
    fund: FundWithEstimate;
    onRemove: (code: string) => void;
    onUpdate: (code: string) => void;
    onClick: (fund: FundWithEstimate) => void;
}

export function MobileFundCard({ fund, onRemove, onUpdate, onClick }: MobileFundCardProps) {
    const isUp = fund.estimate > 0;
    const isDown = fund.estimate < 0;
    const percentStr = (fund.estimate > 0 ? "+" : "") + fund.estimate.toFixed(2);
    const totalRatio = fund.holdings.reduce((sum, h) => sum + h.ratio, 0) * 100;

    return (
        <div className="mobile-fund-card" onClick={() => onClick(fund)}>
            {/* 顶部：名称和删除按钮 */}
            <div className="mobile-card-header">
                <div className="mobile-card-title">
                    <div className="mobile-fund-name" title={fund.name}>{fund.name}</div>
                    <div className="mobile-fund-code">
                        {fund.code}
                        <button
                            className="mobile-update-btn"
                            onClick={(e) => { e.stopPropagation(); onUpdate(fund.code); }}
                        >
                            更新持仓
                        </button>
                    </div>
                </div>
                <button
                    className="mobile-delete-btn"
                    onClick={(e) => { e.stopPropagation(); onRemove(fund.code); }}
                >
                    &times;
                </button>
            </div>

            {/* 中部：净值和涨跌幅 */}
            <div className="mobile-card-body">
                <div className="mobile-nav-section">
                    {fund.dwjz && (
                        <>
                            <div className="mobile-nav-row">昨日净值: {fund.dwjz.toFixed(4)}</div>
                            <div className={`mobile-nav-row ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
                                预估净值: {fund.estimatedNav?.toFixed(4) || '--'}
                            </div>
                        </>
                    )}
                </div>
                <div className={`mobile-estimate ${isUp ? 'up' : isDown ? 'down' : 'neutral'}`}>
                    {percentStr}%
                    <span className="mobile-estimate-label">预估</span>
                </div>
            </div>

            {/* 底部：仓位和更新时间 */}
            <div className="mobile-card-footer">
                <div className="mobile-ratio">
                    <span className="mobile-ratio-dot"></span>
                    前十仓位: {totalRatio.toFixed(2)}%
                </div>
                <div className="mobile-time">更新于: {fund.lastPriceTime || '--:--'}</div>
            </div>
        </div>
    );
}
