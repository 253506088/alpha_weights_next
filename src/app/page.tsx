"use client";

import { useFunds, FundWithEstimate } from "@/hooks/use-funds";
import { useIsMobile } from "@/hooks/useIsMobile";
import { FundCard } from "@/components/FundCard";
import { CreateFund } from "@/components/CreateFund";
import { SettingsModal } from "@/components/SettingsModal";
import { DetailModal } from "@/components/DetailModal";
import { InfoModal } from "@/components/InfoModal";
import { MobileHome } from "@/components/MobileHome";
import { Info, ArrowUp, ArrowDown } from "lucide-react";
import { useState, useMemo } from "react";

export default function Home() {
  const {
    funds,
    loading,
    addFund,
    removeFund,
    updateFundHoldings,
    forceRefresh,
    updateAllFundHoldings
  } = useFunds();

  const isMobile = useIsMobile();

  const [selectedFund, setSelectedFund] = useState<FundWithEstimate | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Sorting Logic
  type SortKey = 'time' | 'estimate';
  type SortDir = 'asc' | 'desc';
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; dir: SortDir }>({ key: 'time', dir: 'asc' });

  const sortedFunds = useMemo(() => {
    // 默认 funds 是按添加时间 asc (数组顺序)
    let sorted = [...funds];
    if (sortConfig.key === 'time') {
      if (sortConfig.dir === 'desc') {
        sorted.reverse();
      }
    } else {
      sorted.sort((a, b) => {
        const valA = a.estimate;
        const valB = b.estimate;
        // Asc: 小到大, Desc: 大到小
        return sortConfig.dir === 'asc' ? valA - valB : valB - valA;
      });
    }
    return sorted;
  }, [funds, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Toggle direction
        return { ...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      // New key, default asc (or desc for numbers? usually lists start asc)
      // For estimate, maybe desc (gainers) is better default? but let's stick to asc default for consistency unless specified.
      // User said: "Default is按照添加时间asc排序". implied initial state.
      return { key, dir: 'asc' };
    });
  };

  // 移动端渲染独立页面
  if (isMobile) {
    return (
      <MobileHome
        funds={funds}
        loading={loading}
        addFund={addFund}
        removeFund={removeFund}
        updateFundHoldings={updateFundHoldings}
        forceRefresh={forceRefresh}
        updateAllFundHoldings={updateAllFundHoldings}
      />
    );
  }

  // PC 端渲染
  return (
    <main className="min-h-screen flex flex-col px-5 py-10 mx-auto max-w-[1200px] pb-20">
      {/* Header */}
      <header className="flex flex-col gap-6 mb-12 items-center text-center">
        {/* 标题独占一行 */}
        <h1 className="flex items-center gap-[50px] m-0">
          <span className="title-text-legacy">
            基金宝：前十重仓股估值看板
          </span>
        </h1>

        {/* 按钮组 */}
        <div className="input-group-legacy">
          <button className="refresh-btn-legacy" onClick={() => setShowInfo(true)}>系统说明</button>
          <button
            onClick={forceRefresh}
            className="refresh-btn-legacy"
          >
            立即计算
          </button>
          <button
            onClick={() => updateAllFundHoldings(true)}
            className="refresh-btn-legacy"
          >
            更新全部持仓
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="refresh-btn-legacy"
          >
            设置
          </button>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 5px' }}></div>

          <button
            onClick={() => handleSort('time')}
            className={`refresh-btn-legacy flex items-center gap-1 ${sortConfig.key === 'time' ? 'text-white' : 'text-sub'}`}
            style={sortConfig.key === 'time' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
          >
            添加时间
            {sortConfig.key === 'time' && (
              sortConfig.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            )}
          </button>

          <button
            onClick={() => handleSort('estimate')}
            className={`refresh-btn-legacy flex items-center gap-1 ${sortConfig.key === 'estimate' ? 'text-white' : 'text-sub'}`}
            style={sortConfig.key === 'estimate' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
          >
            预估涨跌
            {sortConfig.key === 'estimate' && (
              sortConfig.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
            )}
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
          {sortedFunds.map(fund => (
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
        <p >
          本程序与基金真实的涨跌幅会有出入，主要取决于前十大重仓股在该基金的仓位占比，占比越高相对来说越准，本程序不构成任何投资建议。
        </p>
        <a href="https://github.com/253506088/alpha_weights_next" target="_blank" className="hover:text-white transition-colors no-underline flex items-center justify-center gap-2" style={{ color: 'var(--text-sub)' }}>
          GitHub
        </a>
      </footer>
    </main>
  );
}
