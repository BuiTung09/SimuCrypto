import React from "react";
import { Settings, Eye, ChevronDown } from "lucide-react";

type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

interface ChartToolbarProps {
    currentInterval: Interval;
    onIntervalChange: (i: Interval) => void;
    indicators: {
        ma: boolean;
        ema9: boolean;
        ema21: boolean;
        ema50: boolean;
        ema200: boolean;
        boll: boolean;
        rsi: boolean;
        macd: boolean;
        kdj: boolean;
        stochrsi: boolean;
    };
    onToggleIndicator: (key: "ma" | "ema9" | "ema21" | "ema50" | "ema200" | "boll" | "rsi" | "macd" | "kdj" | "stochrsi") => void;
    isDark?: boolean;
}

export const ChartToolbar = ({
    currentInterval,
    onIntervalChange,
    indicators,
    onToggleIndicator,
    isDark = true,
}: ChartToolbarProps) => {
    const intervals: Interval[] = ["1m", "5m", "15m", "1h", "4h", "1d"];

    const btnClass = (active: boolean) =>
        `px-3 py-1.5 text-xs font-medium transition-all duration-200 rounded ${active
            ? "bg-[#fcd535] text-black shadow-sm"
            : isDark ? "text-white/60 hover:text-white hover:bg-white/5" : "text-black/60 hover:text-black hover:bg-black/5"
        }`;

    const indicatorBtnClass = (active: boolean) =>
        `flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 rounded border ${active
            ? "border-[#fcd535] bg-[#fcd535]/10 text-[#fcd535]"
            : isDark ? "border-transparent text-white/40 hover:text-white/70" : "border-transparent text-black/40 hover:text-black/70"
        }`;

    return (
        <div className={`flex flex-wrap items-center gap-4 px-4 py-2 border-b ${isDark ? "bg-[#1e2329] border-white/5" : "bg-gray-50 border-black/5"}`}>
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-md">
                <span className="text-[10px] font-bold text-white/30 px-2 uppercase">Time</span>
                {intervals.map((it) => (
                    <button
                        key={it}
                        onClick={() => onIntervalChange(it)}
                        className={btnClass(currentInterval === it)}
                    >
                        {it}
                    </button>
                ))}
                <button className="px-2 py-1 text-white/30 hover:text-white/60 transition-colors">
                    <ChevronDown className="h-3 w-3" />
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 ml-2">
                    <Eye className="h-3 w-3 opacity-30" />
                    <span className="text-[10px] font-bold text-white/30 uppercase mr-1">Main</span>
                </div>

                {["ma", "ema9", "ema21", "ema50", "ema200", "boll"].map((key) => (
                    <button
                        key={key}
                        onClick={() => onToggleIndicator(key as any)}
                        className={indicatorBtnClass(indicators[key as keyof typeof indicators])}
                    >
                        {key.toUpperCase()}
                    </button>
                ))}

                <div className="h-4 w-px bg-white/10 mx-2" />

                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-white/30 uppercase mr-1">Sub</span>
                </div>

                {["rsi", "macd", "kdj", "stochrsi"].map((key) => (
                    <button
                        key={key}
                        onClick={() => onToggleIndicator(key as any)}
                        className={indicatorBtnClass(indicators[key as keyof typeof indicators])}
                    >
                        {key.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="ml-auto">
                <button className={`p-1.5 rounded hover:bg-white/5 transition-colors ${isDark ? "text-white/40" : "text-black/40"}`}>
                    <Settings className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};
