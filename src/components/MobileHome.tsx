"use client";

import { FundWithEstimate } from "@/hooks/use-funds";
import { MobileFundCard } from "@/components/MobileFundCard";
import { CreateFund } from "@/components/CreateFund";
import { MobileSettingsModal } from "@/components/MobileSettingsModal";
import { MobileDetailModal } from "@/components/MobileDetailModal";
import { MobileInfoModal } from "@/components/MobileInfoModal";
import { Info, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";

interface MobileHomeProps {
    funds: FundWithEstimate[];
    loading: boolean;
    addFund: (code: string) => Promise<void>;
    removeFund: (code: string) => void;
    updateFundHoldings: (code: string) => Promise<void>;
    forceRefresh: () => Promise<void>;
    updateAllFundHoldings: (force: boolean) => Promise<void>;
}

export function MobileHome({
    funds,
    loading,
    addFund,
    removeFund,
    updateFundHoldings,
    forceRefresh,
    updateAllFundHoldings
}: MobileHomeProps) {
    const [selectedFund, setSelectedFund] = useState<FundWithEstimate | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // Sorting Logic
    type SortKey = 'time' | 'estimate';
    type SortDir = 'asc' | 'desc';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({ key: 'time', dir: 'asc' });

    const sortedFunds = useMemo(() => {
        let sorted = [...funds];
        if (sortConfig.key === 'time') {
            if (sortConfig.dir === 'desc') {
                sorted.reverse();
            }
        } else {
            sorted.sort((a, b) => {
                const valA = a.estimate;
                const valB = b.estimate;
                return sortConfig.dir === 'asc' ? valA - valB : valB - valA;
            });
        }
        return sorted;
    }, [funds, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { ...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
            }
            return { key, dir: 'asc' };
        });
    };

    return (
        <>
            <main className="mobile-main">
                {/* 标题 */}
                <header className="mobile-header">
                    <h1 className="mobile-title">基金宝：前十重仓股估值看板</h1>

                    {/* 按钮组 */}
                    <div className="mobile-btn-group">
                        <button className="mobile-action-btn" onClick={() => setShowInfo(true)}>
                            系统说明
                        </button>
                        <button className="mobile-action-btn" onClick={() => updateAllFundHoldings(true)}>
                            更新全部
                        </button>
                        <button className="mobile-action-btn" onClick={forceRefresh}>
                            立即计算
                        </button>
                        <button className="mobile-action-btn" onClick={() => setShowSettings(true)}>
                            设置
                        </button>
                    </div>

                    <div className="mobile-btn-group" style={{ marginTop: '10px' }}>
                        <button
                            onClick={() => handleSort('time')}
                            className={`mobile-action-btn flex items-center gap-1 ${sortConfig.key === 'time' ? 'active' : ''}`}
                            style={sortConfig.key === 'time' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                        >
                            添加时间
                            {sortConfig.key === 'time' && (
                                sortConfig.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                        </button>
                        <button
                            onClick={() => handleSort('estimate')}
                            className={`mobile-action-btn flex items-center gap-1 ${sortConfig.key === 'estimate' ? 'active' : ''}`}
                            style={sortConfig.key === 'estimate' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                        >
                            预估涨跌
                            {sortConfig.key === 'estimate' && (
                                sortConfig.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                            )}
                        </button>
                    </div>

                    {/* 添加基金 */}
                    <div className="mobile-add-fund">
                        <CreateFund onAdd={addFund} loading={loading} />
                    </div>
                </header>

                {/* 基金列表 */}
                <section className="mobile-fund-list">
                    {funds.length === 0 ? (
                        <div className="mobile-empty">
                            <Info className="mobile-empty-icon" />
                            <p>暂无基金，请添加代码开始监控</p>
                        </div>
                    ) : (
                        sortedFunds.map(fund => (
                            <MobileFundCard
                                key={fund.code}
                                fund={fund}
                                onRemove={removeFund}
                                onUpdate={updateFundHoldings}
                                onClick={setSelectedFund}
                            />
                        ))
                    )}
                </section>

                {/* 底部 */}
                <footer className="mobile-footer">
                    <p className="mobile-disclaimer">
                        本程序与基金真实的涨跌幅会有出入，主要取决于前十大重仓股在该基金的仓位占比，占比越高相对来说越准，本程序不构成任何投资建议。
                    </p>
                    <a href="https://github.com/253506088/alpha_weights_next" target="_blank" className="mobile-github-link">
                        GitHub
                    </a>
                </footer>
            </main>

            {/* Modals - 移到 main 外部避免受 overflow 影响 */}
            {selectedFund && <MobileDetailModal fund={selectedFund} onClose={() => setSelectedFund(null)} />}
            {showSettings && <MobileSettingsModal onClose={() => setShowSettings(false)} />}
            {showInfo && <MobileInfoModal onClose={() => setShowInfo(false)} />}
        </>
    );
}
