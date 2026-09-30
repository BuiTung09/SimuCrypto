import { useEffect, useMemo, useState, useRef } from "react";
import { Search, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { COINS, type MarketRow, fetchBinance24h, formatCompact } from "../lib/binanceMarket";
import { ScrollReveal } from "./ScrollReveal";

interface MarketProps {
  onNavigate: (page: "dashboard" | "market" | "trading" | "news" | "community", coinId?: string) => void;
}

export function Market({ onNavigate }: MarketProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "gainers" | "losers">("all");

  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [globalStats, setGlobalStats] = useState<{ cap: number; btcDom: number }>({ cap: 0, btcDom: 0 });
  const marketCapsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    const fetchGlobal = async () => {
      try {
        const ids = COINS.map(c => c.id).join(',');
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false`);
        if (!res.ok) return;
        const data = await res.json();
        
        const capsMap: Record<string, number> = {};
        let totalCap = 0;
        data.forEach((coin: any) => {
          capsMap[coin.id] = coin.market_cap;
          totalCap += (coin.market_cap || 0);
        });

        const btcCoin = data.find((c: any) => c.id === 'bitcoin');
        const btcDom = btcCoin && totalCap ? (btcCoin.market_cap / totalCap) * 100 : 0;
        
        if (alive) {
          setGlobalStats({ cap: totalCap, btcDom });
          marketCapsRef.current = capsMap;
        }
      } catch (error) {
        console.error("Error fetching market stats:", error);
      }
    };

    fetchGlobal();
    const t = setInterval(fetchGlobal, 300_000); // 5 mins refresh for Cap
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setError(null);
        const pairs = COINS.map((c) => c.pair);
        const data = await fetchBinance24h(pairs);

        const next: MarketRow[] = COINS.map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol,
          pair: c.pair,
          logo: (c as any).logo,
          price: data[c.pair]?.lastPrice ?? 0,
          change24h: data[c.pair]?.changePct ?? 0,
          volume24h: data[c.pair]?.quoteVolume ?? 0,
          marketCap: marketCapsRef.current[c.id] || 0,
        }));

        if (alive) setRows(next);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Fetch error");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const filteredCoins = useMemo(() => {
    return rows.filter((coin) => {
      const matchesSearch =
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterType === "gainers") return matchesSearch && coin.change24h > 0;
      if (filterType === "losers") return matchesSearch && coin.change24h < 0;
      return matchesSearch;
    });
  }, [rows, searchTerm, filterType]);

  const stats = useMemo(() => {
    const totalVol = rows.reduce((s, r) => s + (Number.isFinite(r.volume24h) ? r.volume24h : 0), 0);
    return {
      totalMarketCap: globalStats.cap ? `$${formatCompact(globalStats.cap)}` : "—",
      totalVolume24h: totalVol ? `$${formatCompact(totalVol)}` : "—",
      btcDominance: globalStats.btcDom ? `${globalStats.btcDom.toFixed(1)}%` : "—",
    };
  }, [rows, globalStats]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <ScrollReveal delay={0.1}>
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-black">Thị trường Coin</h1>
          <p className="text-black/60">Giá & biến động 24h từ Binance (poll 10s)</p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Tìm kiếm coin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-white py-2.5 pl-10 pr-4 text-black placeholder:text-black/40 focus:border-[#559DD2] focus:outline-none focus:ring-2 focus:ring-[#559DD2]/20"
            />
          </div>

          <div className="flex gap-2">
            {[
              { value: "all", label: "Tất cả" },
              { value: "gainers", label: "Tăng giá" },
              { value: "losers", label: "Giảm giá" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setFilterType(filter.value as typeof filterType)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filterType === filter.value
                  ? "bg-[#559DD2] text-black"
                  : "border border-black/10 bg-white text-black/60 hover:bg-black/5"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        {loading && (
          <div className="mb-4 rounded-xl border border-black/10 bg-white p-4 text-sm text-black/60">
            Đang tải dữ liệu thị trường...
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Lỗi tải dữ liệu: {error}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-sm text-black/60">
              <TrendingUp className="h-4 w-4" />
              Tổng vốn hóa
            </div>
            <div className="text-2xl font-bold text-black">{stats.totalMarketCap}</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="mb-1 text-sm text-black/60">Khối lượng 24h</div>
            <div className="text-2xl font-bold text-black">{stats.totalVolume24h}</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="mb-1 text-sm text-black/60">Thống trị BTC</div>
            <div className="text-2xl font-bold text-black">{stats.btcDominance}</div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.3}>
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-black/10 bg-black/5">
                <tr>
                  <th className="hidden md:table-cell px-6 py-4 text-left text-sm font-medium text-black/60">#</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-black/60">Tên</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-black/60">Giá</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-black/60">Thay đổi 24h</th>
                  <th className="hidden md:table-cell px-6 py-4 text-right text-sm font-medium text-black/60">Vốn hóa</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-right text-sm font-medium text-black/60">Khối lượng 24h</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-black/60"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/10">
                {filteredCoins.map((coin, index) => (
                  <tr key={coin.id} className="transition-colors hover:bg-black/5">
                    <td className="hidden md:table-cell px-6 py-4 text-sm text-black/60">{index + 1}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {coin.logo ? (
                          <img
                            src={coin.logo}
                            alt={coin.symbol}
                            className="h-10 w-10 rounded-full bg-[#559DD2]/20 p-1"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#559DD2]/20 font-bold text-black">
                            {coin.symbol.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-black">{coin.name}</div>
                          <div className="text-sm text-black/60">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-black">
                      ${coin.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className={`inline-flex items-center gap-1 ${coin.change24h > 0 ? "text-green-600" : "text-red-600"}`}>
                        {coin.change24h > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        <span className="font-medium">
                          {coin.change24h > 0 ? "+" : ""}
                          {coin.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </td>

                    <td className="hidden md:table-cell px-6 py-4 text-right text-black/60">
                      {coin.marketCap ? `$${formatCompact(coin.marketCap)}` : "—"}
                    </td>

                    <td className="hidden lg:table-cell px-6 py-4 text-right text-black/60">${formatCompact(coin.volume24h)}</td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onNavigate("trading", coin.id)} // ✅ map coin -> practice
                        className="rounded-lg bg-[#559DD2] px-4 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
                      >
                        Giao dịch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredCoins.length === 0 && (
            <div className="py-12 text-center text-black/60">Không tìm thấy coin phù hợp với tìm kiếm của bạn.</div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}
