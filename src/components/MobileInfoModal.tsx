"use client";

interface MobileInfoModalProps {
    onClose: () => void;
}

export function MobileInfoModal({ onClose }: MobileInfoModalProps) {
    return (
        <div className="mobile-modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="mobile-modal">
                <div className="mobile-modal-header">
                    <h3>系统逻辑说明</h3>
                    <button className="mobile-modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="mobile-modal-content mobile-info-content">
                    <div className="mobile-info-warning">
                        ⚠️ 本程序不构成任何投资建议
                    </div>

                    <div className="mobile-info-section">
                        <h4>1. 核心原理</h4>
                        <p>
                            本系统通过抓取基金的<strong>前十大重仓股及其持仓占比</strong>，
                            结合这些股票的<strong>实时涨跌幅</strong>，来估算基金当天的实时净值变化。
                        </p>
                    </div>

                    <div className="mobile-info-section">
                        <h4>2. 数据来源</h4>
                        <ul>
                            <li><strong>基金持仓：</strong>来自东方财富网，通常为最新季报数据</li>
                            <li><strong>实时股价：</strong>来自腾讯财经，每1分钟更新一次</li>
                        </ul>
                    </div>

                    <div className="mobile-info-section">
                        <h4>3. 更新机制</h4>
                        <ul>
                            <li><strong>交易时间：</strong>9:30~11:30, 13:00~15:00，每1分钟自动计算</li>
                            <li><strong>智能更新：</strong>每日首次打开会自动检查并更新持仓数据</li>
                            <li><strong>手动触发：</strong>点击"立即计算"可强制立即运行计算</li>
                        </ul>
                    </div>

                    <div className="mobile-info-section">
                        <h4>4. 常用操作</h4>
                        <ul>
                            <li><strong>更新持仓：</strong>如果估值不准，可能是持仓数据滞后，点击"更新持仓"重新抓取</li>
                            <li><strong>删除基金：</strong>点击卡片右上角的 × 删除基金及历史数据</li>
                        </ul>
                    </div>

                    <div className="mobile-info-note">
                        * 估值仅供参考，实际净值请以基金公司官方公布为准。因只计算前十大重仓（通常占50%-70%仓位），与实际波动会有一定偏差。
                    </div>
                </div>
            </div>
        </div>
    );
}
