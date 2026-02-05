"use client";

import { X } from "lucide-react";

interface InfoModalProps {
    onClose: () => void;
}

export function InfoModal({ onClose }: InfoModalProps) {
    return (
        <div className="modal-overlay active" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal modal-legacy" style={{ maxWidth: '600px' }}>
                <div className="close-btn" onClick={onClose}>&times;</div>
                <h3 style={{ marginBottom: '20px' }}>
                    系统逻辑说明
                </h3>

                <div className="modal-body" style={{ display: 'block', padding: '0 10px' }}>
                    <div style={{ color: '#e2e8f0', lineHeight: '1.6', fontSize: '14px' }}>

                        <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '10px', marginTop: '0' }}>本程序不构成任何投资建议</h4>
                        <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '10px', marginTop: '0' }}>1. 核心原理</h4>
                        <p style={{ marginBottom: '20px', color: '#94a3b8' }}>
                            本系统通过抓取基金的<strong style={{ color: '#e2e8f0' }}>前十大重仓股及其持仓占比</strong>，结合这些股票的<strong style={{ color: '#e2e8f0' }}>实时涨跌幅</strong>，来估算基金当天的实时净值变化。
                        </p>

                        <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '10px' }}>2. 数据来源</h4>
                        <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#94a3b8' }}>
                            <li style={{ marginBottom: '8px' }}>
                                <span style={{ color: '#e2e8f0' }}>基金持仓：</span> 来自东方财富网 (PC端接口)，通常为最新季报数据。
                            </li>
                            <li>
                                <span style={{ color: '#e2e8f0' }}>实时股价：</span> 来自腾讯财经 (High Frequency Interface)，每1分钟更新一次。
                            </li>
                        </ul>

                        <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '10px' }}>3. 更新机制</h4>
                        <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#94a3b8' }}>
                            <li style={{ marginBottom: '8px' }}>
                                <span style={{ color: '#e2e8f0' }}>交易时间：</span> 9:30~11:30, 13:00~15:00，每1分钟自动计算一次。
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                <span style={{ color: '#e2e8f0' }}>智能更新：</span> 每日首次打开会自动检查并更新持仓数据。
                            </li>
                            <li>
                                <span style={{ color: '#e2e8f0' }}>手动触发：</span> 点击“立即计算”可强制立即运行一次计算逻辑。
                            </li>
                        </ul>

                        <h4 style={{ color: '#fff', fontSize: '16px', marginBottom: '10px' }}>4. 常用操作</h4>
                        <ul style={{ marginBottom: '20px', paddingLeft: '20px', color: '#94a3b8' }}>
                            <li style={{ marginBottom: '8px' }}>
                                <span style={{ color: '#e2e8f0' }}>更新持仓：</span> 如果发现估值不准，可能是持仓数据滞后。点击卡片上的“更新持仓”可强制重新抓取最新的季报持仓。
                            </li>
                            <li>
                                <span style={{ color: '#e2e8f0' }}>删除基金：</span> 点击卡片右上角的 × 可删除基金及其历史数据。
                            </li>
                        </ul>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '20px', fontSize: '12px', color: '#64748b' }}>
                            * 注意：估值仅供参考，实际净值请以基金公司官方公布为准。因只计算前十大重仓（通常占50%-70%仓位），与实际波动会有一定偏差。
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
