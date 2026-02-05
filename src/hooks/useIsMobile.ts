"use client";

import { useState, useEffect } from "react";

/**
 * 检测当前设备是否为移动端
 * 使用 window.matchMedia 监听屏幕宽度变化
 */
export function useIsMobile(breakpoint: number = 640): boolean {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // 初始检测
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // 初始化
        checkMobile();

        // 监听窗口大小变化
        const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

        const handleChange = (e: MediaQueryListEvent) => {
            setIsMobile(e.matches);
        };

        // 添加监听器
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, [breakpoint]);

    return isMobile;
}
