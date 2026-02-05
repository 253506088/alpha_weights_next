"use client";

import { useFunds, FundWithEstimate } from "@/hooks/use-funds";
import { FundCard } from "@/components/FundCard";
import { CreateFund } from "@/components/CreateFund";
import { SettingsModal } from "@/components/SettingsModal";
import { DetailModal } from "@/components/DetailModal";
import { InfoModal } from "@/components/InfoModal";
import { Settings, RefreshCw, Info } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const {
    funds,
    loading,
    addFund,
    removeFund,
    updateFundHoldings,
    forceRefresh
  } = useFunds();

  const [selectedFund, setSelectedFund] = useState<FundWithEstimate | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Using specific style for container from legacy: max-width: 1200px
  return (
    <main className="min-h-screen flex flex-col px-5 py-10 mx-auto max-w-[1200px] pb-20">
      {/* Header */}
      <header className="flex flex-col gap-6 mb-12 items-center text-center">
        <h1 className="flex items-center gap-[50px] m-0">
          <span className="title-text-legacy">
            基金前十重仓股估值看板
          </span>
          <button className="refresh-btn-legacy" onClick={() => setShowInfo(true)}>系统说明</button>
        </h1>

        {/* Input & Controls Group - Matching 'input-group' in legacy */}
        <div className="input-group-legacy">
          <button
            onClick={forceRefresh}
            className="refresh-btn-legacy"
          >
            刷新列表
          </button>
          <button
            onClick={forceRefresh}
            className="refresh-btn-legacy"
          >
            立即计算
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="refresh-btn-legacy"
          >
            设置
          </button>

          <CreateFund onAdd={addFund} loading={loading} />
        </div>
      </header>

      {/* Grid */}
      {funds.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无基金，请添加代码开始监控</p>
        </div>
      ) : (
        <div className="fund-grid">
          {funds.map(fund => (
            <FundCard
              key={fund.code}
              fund={fund}
              onRemove={removeFund}
              onUpdate={updateFundHoldings}
              onClick={setSelectedFund}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedFund && <DetailModal fund={selectedFund} onClose={() => setSelectedFund(null)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {/* Spacer to push footer to bottom */}
      <div className="flex-grow"></div>

      <footer className="mt-16 text-center text-sm text-sub opacity-80 pb-5">
        <a href="https://github.com/253506088/alpha_weights" target="_blank" className="hover:text-white transition-colors no-underline flex items-center justify-center gap-2" style={{ color: 'var(--text-sub)' }}>
          GitHub
        </a>
      </footer>
    </main>
  );
}
