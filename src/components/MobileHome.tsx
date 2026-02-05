"use client";

import { FundWithEstimate } from "@/hooks/use-funds";
import { MobileFundCard } from "@/components/MobileFundCard";
import { CreateFund } from "@/components/CreateFund";
import { MobileSettingsModal } from "@/components/MobileSettingsModal";
import { MobileDetailModal } from "@/components/MobileDetailModal";
import { MobileInfoModal } from "@/components/MobileInfoModal";
import { Info } from "lucide-react";
import { useState } from "react";

interface MobileHomeProps {
    funds: FundWithEstimate[];
    loading: boolean;
    addFund: (code: string) => Promise<void>;
    removeFund: (code: string) => void;
    updateFundHoldings: (code: string) => Promise<void>;
    forceRefresh: () => Promise<void>;
}

export function MobileHome({
    funds,
    loading,
    addFund,
    removeFund,
    updateFundHoldings,
    forceRefresh
}: MobileHomeProps) {
    const [selectedFund, setSelectedFund] = useState<FundWithEstimate | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

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
                        <button className="mobile-action-btn" onClick={forceRefresh}>
                            立即计算
                        </button>
                        <button className="mobile-action-btn" onClick={() => setShowSettings(true)}>
                            设置
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
                        funds.map(fund => (
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
                        本程序按照基金公布的前十大重仓股当日的涨跌幅计算出预估涨跌幅，与基金真实的涨跌幅会有出入，主要取决于前十大重仓股在该基金的仓位占比，占比越高相对来说越准。本程序不构成任何投资建议。
                    </p>
                    <a href="https://github.com/253506088/alpha_weights" target="_blank" className="mobile-github-link">
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
