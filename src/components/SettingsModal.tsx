"use client";

import { useFunds } from "@/hooks/use-funds";
import { StorageManager } from "@/lib/storage";
import { X, Copy, Download, Upload } from "lucide-react";
import { useState } from "react";

interface SettingsModalProps {
    onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
    const { refreshInterval, updateConfig } = useFunds();
    const [importStr, setImportStr] = useState("");
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md rounded-xl p-6 relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-6 text-slate-100">系统设置</h2>

                <div className="space-y-6">
                    {/* Refresh Interval */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            自动刷新间隔 (秒)
                        </label>
                        <input
                            type="number"
                            min="30"
                            value={refreshInterval}
                            onChange={(e) => updateConfig(parseInt(e.target.value) || 30)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">最小 30 秒</p>
                    </div>

                    <hr className="border-slate-700/50" />

                    {/* Export */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            导出配置
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200"
                            >
                                <Download className="w-4 h-4" />
                                生成配置码
                            </button>
                            {exportStr && (
                                <button
                                    onClick={() => navigator.clipboard.writeText(exportStr)}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm"
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
                                className="mt-2 w-full h-20 bg-slate-950/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-400 font-mono resize-none outline-none"
                            />
                        )}
                    </div>

                    <hr className="border-slate-700/50" />

                    {/* Import */}
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">
                            导入配置
                        </label>
                        <textarea
                            value={importStr}
                            onChange={(e) => setImportStr(e.target.value)}
                            placeholder="在此粘贴配置码..."
                            className="w-full h-20 bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono resize-none outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                        />
                        <button
                            onClick={handleImport}
                            disabled={!importStr}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            导入并重启
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
