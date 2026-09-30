import React, { useState, useRef, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Activity, BarChart3, ChevronDown, Search, X } from "lucide-react";

interface ChartHeaderProps {
    symbol: string;
    price: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    isDark?: boolean;
    onSymbolChange?: (s: string) => void;
    availableSymbols?: string[];
}

export const ChartHeader = ({
    symbol,
    price,
    change24h,
    high24h,
    low24h,
    volume24h,
    isDark = true,
    onSymbolChange,
    availableSymbols = [],
}: ChartHeaderProps) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isPositive = change24h >= 0;
    const textColor = isPositive ? "text-[#0ecb81]" : "text-[#f6465d]";
    const bgColor = isPositive ? "bg-[#0ecb81]/10" : "bg-[#f6465d]/10";

    const formatPrice = (val: number) => {
        if (val === 0) return "---";
        return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatVol = (val: number) => {
        if (val >= 1e9) return (val / 1e9).toFixed(2) + "B";
        if (val >= 1e6) return (val / 1e6).toFixed(2) + "M";
        if (val >= 1e3) return (val / 1e3).toFixed(2) + "K";
        return val.toFixed(2);
    };

    return (
        <div className={`flex flex-wrap items-center gap-6 p-4 ${isDark ? "bg-[#0b0e11] border-b border-white/5" : "bg-white border-b border-black/5"}`}>
            <div className="relative z-50" ref={dropdownRef}>
                <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-[#fcd535] font-bold text-black shadow-lg shadow-[#fcd535]/20`}>
                        {symbol.charAt(0)}
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-black"} group-hover:text-[#fcd535] transition-colors`}>
                            {symbol} <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </h2>
                        <div className="text-[10px] uppercase tracking-wider opacity-50">Binance Spot</div>
                    </div>
                </div>

                {isDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-2 w-72 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 border ${isDark ? "bg-[#1e2329] border-white/10" : "bg-white border-black/10"}`}>
                        <div className={`p-3 border-b ${isDark ? "border-white/5" : "border-black/5"}`}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search coins..."
                                    value={searchTerm}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                    className={`w-full rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#fcd535] border ${isDark ? "bg-[#0b0e11] border-white/10 text-white" : "bg-gray-50 border-black/10 text-black"}`}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 px-4 py-2 text-[10px] uppercase tracking-wider opacity-30 font-bold border-b border-white/5">
                                <span>Pair</span>
                                <span className="text-right">Price</span>
                            </div>
                            {availableSymbols.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase())).map(pair => {
                                const isSelected = symbol === pair;
                                return (
                                    <div
                                        key={pair}
                                        onClick={() => {
                                            onSymbolChange?.(pair);
                                            setIsDropdownOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all border-l-2 ${isSelected
                                            ? 'border-[#fcd535] bg-[#fcd535]/10'
                                            : 'border-transparent hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-[#fcd535] text-black' : 'bg-white/5 text-white/40'}`}>
                                                {pair.charAt(0)}
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm ${isDark ? "text-white" : "text-black"}`}>{pair.replace('USDT', '')}<span className="text-[10px] opacity-30 ml-0.5">/USDT</span></div>
                                                <div className="text-[10px] opacity-30">Binance Market</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col">
                <div className={`text-2xl font-bold tabular-nums ${textColor}`}>
                    ${formatPrice(price)}
                </div>
                <div className="text-[10px] opacity-50 mt-0.5">Last Price</div>
            </div>

            <div className="flex flex-col gap-1">
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${bgColor} ${textColor}`}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isPositive ? "+" : ""}{change24h.toFixed(2)}%
                </div>
                <div className="text-[10px] opacity-50 px-1">24h Change</div>
            </div>

            <div className="hidden sm:flex border-l border-white/10 h-10 mx-2" />

            <div className="hidden md:grid grid-cols-3 gap-8">
                <div className="flex flex-col">
                    <div className={`text-sm font-medium tabular-nums ${isDark ? "text-white/90" : "text-black/90"}`}>
                        ${formatPrice(high24h)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] opacity-50">
                        <TrendingUp className="h-2.5 w-2.5" /> 24h High
                    </div>
                </div>

                <div className="flex flex-col">
                    <div className={`text-sm font-medium tabular-nums ${isDark ? "text-white/90" : "text-black/90"}`}>
                        ${formatPrice(low24h)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] opacity-50">
                        <TrendingDown className="h-2.5 w-2.5" /> 24h Low
                    </div>
                </div>

                <div className="flex flex-col">
                    <div className={`text-sm font-medium tabular-nums ${isDark ? "text-white/90" : "text-black/90"}`}>
                        {formatVol(volume24h)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] opacity-50">
                        <BarChart3 className="h-2.5 w-2.5" /> 24h Volume (USDT)
                    </div>
                </div>
            </div>

            <div className="ml-auto hidden lg:flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] opacity-50 uppercase tracking-tighter">
                    <Activity className="h-3 w-3 text-[#fcd535]" /> Live Stream
                </div>
            </div>
        </div>
    );
};
