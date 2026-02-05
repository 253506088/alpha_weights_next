"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CreateFundProps {
    onAdd: (code: string) => Promise<void>;
    loading: boolean;
}

export function CreateFund({ onAdd, loading }: CreateFundProps) {
    const [code, setCode] = useState("");

    const handleSubmit = async () => {
        if (code.length < 6) return;
        await onAdd(code);
        setCode("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    }

    // Legacy style: Input inside the group, button next to it.
    // In Page.tsx, this component is inside the .input-group-legacy container.
    // So we just render the input and the button (actually mostly just the input and button inside)
    // Wait, in Page.tsx I put <CreateFund /> inside the flex container.

    return (
        <>
            <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={handleKeyDown}
                placeholder="输入6位基金代码 (如 000001)"
                className="input-legacy"
                disabled={loading}
            />
            <button
                onClick={handleSubmit}
                className="btn-primary-legacy"
            >
                {loading ? "添加中..." : "添加"}
            </button>
        </>
    );
}
