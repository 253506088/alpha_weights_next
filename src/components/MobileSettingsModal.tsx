"use client";

import { useFunds } from "@/hooks/use-funds";
import { StorageManager } from "@/lib/storage";
import { useState } from "react";

interface MobileSettingsModalProps {
    onClose: () => void;
}

export function MobileSettingsModal({ onClose }: MobileSettingsModalProps) {
    const { refreshInterval, updateConfig } = useFunds();
    const [savedMsg, setSavedMsg] = useState("");
    const [importStr, setImportStr] = useState("");
    const [exportStr, setExportStr] = useState("");

    const handleConfigChange = (val: number) => {
        updateConfig(val);
        setSavedMsg("已保存");
        setTimeout(() => setSavedMsg(""), 2000);
    };

    const handleExport = () => {
        const str = StorageManager.exportData();
        setExportStr(str);
        // 自动复制到剪贴板
        navigator.clipboard.writeText(str);
        alert("配置码已生成并复制到剪贴板");
    };

    const handleImport = () => {
        if (!importStr) return;
        if (confirm("导入配置将覆盖现有所有数据，确定继续吗？")) {
            const success = StorageManager.importData(importStr);
            if (success) {
                alert("导入成功，页面将刷新");
                window.location.reload();
            } else {
                alert("导入失败，数据格式错误");
            }
        }
    };

    return (
        <div className="mobile-modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="mobile-modal">
                <div className="mobile-modal-header">
                    <h3>系统设置</h3>
                    <button className="mobile-modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="mobile-modal-content">
                    {/* 刷新间隔 */}
                    <div className="mobile-setting-group">
                        <label>自动刷新间隔 (秒)</label>
                        <div className="mobile-input-wrap">
                            <input
                                type="number"
                                min="30"
                                value={refreshInterval}
                                onChange={(e) => handleConfigChange(parseInt(e.target.value) || 30)}
                            />
                            {savedMsg && <span className="mobile-saved-msg">✓ {savedMsg}</span>}
                        </div>
                        <p className="mobile-hint">最小 30 秒</p>
                    </div>

                    <div className="mobile-divider"></div>

                    {/* 导出 */}
                    <div className="mobile-setting-group">
                        <label>导出配置</label>
                        <button className="mobile-full-btn" onClick={handleExport}>
                            生成配置码并复制
                        </button>
                        {exportStr && (
                            <textarea
                                readOnly
                                value={exportStr}
                                className="mobile-textarea"
                            />
                        )}
                    </div>

                    <div className="mobile-divider"></div>

                    {/* 导入 */}
                    <div className="mobile-setting-group">
                        <label>导入配置</label>
                        <textarea
                            value={importStr}
                            onChange={(e) => setImportStr(e.target.value)}
                            placeholder="在此粘贴配置码..."
                            className="mobile-textarea"
                        />
                        <button
                            className={`mobile-full-btn ${importStr ? 'active' : 'disabled'}`}
                            onClick={handleImport}
                            disabled={!importStr}
                        >
                            导入并重启
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
