"use client";

import { useFunds } from "@/hooks/use-funds";
import { StorageManager } from "@/lib/storage";
import { X, Copy, Download, Upload, Trash2 } from "lucide-react";
import { useState } from "react";

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { refreshInterval, updateConfig } = useFunds();
    const [savedMsg, setSavedMsg] = useState("");
    const [importStr, setImportStr] = useState("");

    const handleConfigChange = (val: number) => {
        updateConfig(val);
        setSavedMsg("已保存");
        setTimeout(() => setSavedMsg(""), 2000);
    };
    const [exportStr, setExportStr] = useState("");

    const handleExport = () => {
        const str = StorageManager.exportData();
        setExportStr(str);
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

    const handleClearAll = () => {
        if (confirm("警告！确定要清空所有基金数据吗？\n\n此操作不可撤销！")) {
            if (confirm("再次确认：清空后所有基金和历史数据都将丢失，确定继续吗？")) {
                // 清空所有 localStorage 中的应用数据
                const keysToRemove: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('alpha_weights_')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                alert("已清空所有数据，页面将刷新");
                window.location.reload();
            }
        }
    };

    return (
        <div className="modal-overlay active" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="modal modal-legacy" style={{ maxWidth: '450px' }}>
                <div className="close-btn" onClick={onClose}>&times;</div>
                <h3 style={{ marginBottom: '25px' }}>系统设置</h3>

                <div className="modal-body" style={{ display: 'block', padding: '0 10px' }}>

                    {/* Refresh Interval */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: 'var(--text-sub)', marginBottom: '10px', fontSize: '14px' }}>
                            自动刷新间隔 (秒)
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                min="30"
                                value={refreshInterval}
                                onChange={(e) => handleConfigChange(parseInt(e.target.value) || 30)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '10px',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    outline: 'none'
                                }}
                            />
                            {savedMsg && (
                                <span style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#10b981',
                                    fontSize: '12px',
                                    fontWeight: 500
                                }}>
                                    ✓ {savedMsg}
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '8px', opacity: 0.7 }}>最小 30 秒</p>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }}></div>

                    {/* Export */}
                    <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', color: 'var(--text-sub)', marginBottom: '10px', fontSize: '14px' }}>
                            导出配置
                        </label>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <button
                                onClick={handleExport}
                                className="refresh-btn-legacy"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '13px' }}
                            >
                                <Download className="w-4 h-4" />
                                生成配置码
                            </button>
                            {exportStr && (
                                <button
                                    onClick={() => navigator.clipboard.writeText(exportStr)}
                                    className="refresh-btn-legacy"
                                    style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}
                                >
                                    <Copy className="w-4 h-4" />
                                    复制
                                </button>
                            )}
                        </div>
                        {exportStr && (
                            <textarea
                                readOnly
                                value={exportStr}
                                style={{
                                    width: '100%',
                                    height: '80px',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    padding: '10px',
                                    color: 'var(--text-sub)',
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    resize: 'none',
                                    outline: 'none'
                                }}
                            />
                        )}
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }}></div>

                    {/* Import */}
                    <div>
                        <label style={{ display: 'block', color: 'var(--text-sub)', marginBottom: '10px', fontSize: '14px' }}>
                            导入配置
                        </label>
                        <textarea
                            value={importStr}
                            onChange={(e) => setImportStr(e.target.value)}
                            placeholder="在此粘贴配置码..."
                            style={{
                                width: '100%',
                                height: '80px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '6px',
                                padding: '10px',
                                color: '#fff',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                resize: 'none',
                                outline: 'none',
                                marginBottom: '15px'
                            }}
                        />
                        <button
                            onClick={handleImport}
                            disabled={!importStr}
                            className="refresh-btn-legacy"
                            style={{
                                width: '100%',
                                background: importStr ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: importStr ? '#fff' : 'rgba(255,255,255,0.3)',
                                cursor: importStr ? 'pointer' : 'not-allowed'
                            }}
                        >
                            <Upload className="w-4 h-4 inline-block mr-2" />
                            导入并重启
                        </button>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '20px 0' }}></div>

                    {/* 危险操作 */}
                    <div>
                        <label style={{ display: 'block', color: '#ef4444', marginBottom: '10px', fontSize: '14px' }}>
                            危险操作
                        </label>
                        <button
                            onClick={handleClearAll}
                            className="refresh-btn-legacy"
                            style={{
                                width: '100%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                            清空所有数据
                        </button>
                        <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px', opacity: 0.7 }}>此操作不可撤销，请谨慎！</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
