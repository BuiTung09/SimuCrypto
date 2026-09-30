import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type LogicalRange,
} from "lightweight-charts";

type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
type Theme = "dark" | "light";

type Props = {
  symbolPair: string; // "BTCUSDT"
  interval?: Interval;
  theme?: Theme;
  onPrice?: (p: number) => void;
  heightPx?: number; // total height of widget
  className?: string;
  historyLimit?: number;
  /** nếu true: lần đầu load history sẽ fitContent() */
  fitOnFirstLoad?: boolean;

  /** (optional) nếu muốn DEV dùng polling REST thay vì WS */
  devPolling?: boolean;
  devPollingMs?: number;

  /** show/hide toolbar */
  showToolbar?: boolean;

  /** indicator pane height (px) */
  indicatorHeightPx?: number;
};

type KlineMsg = {
  e: "kline";
  E: number;
  s: string;
  k: {
    t: number; // start time (ms)
    T: number; // close time (ms)
    s: string;
    i: string;
    f: number;
    L: number;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    n: number;
    x: boolean;
    q: string;
    V: string;
    Q: string;
    B: string;
  };
};

function toCandleFromKlineArr(k: any[]): CandlestickData<UTCTimestamp> {
  return {
    time: Math.floor(k[0] / 1000) as UTCTimestamp,
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  };
}

function toVolumeFromKlineArr(k: any[]): HistogramData<UTCTimestamp> {
  const open = Number(k[1]);
  const close = Number(k[4]);
  return {
    time: Math.floor(k[0] / 1000) as UTCTimestamp,
    value: Number(k[5]),
    color: close >= open ? "rgba(14, 203, 129, 0.5)" : "rgba(246, 70, 93, 0.5)",
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** ------------------------------
 *  Indicator helpers
 *  ------------------------------ */
function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length === 0) return out;
  const k = 2 / (period + 1);

  // seed = SMA(period)
  if (values.length < period) return out;
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function stddev(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i - period + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / period;
    const variance =
      window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    out[i] = Math.sqrt(variance);
  }
  return out;
}

function bollinger(
  closes: number[],
  period = 20,
  mult = 2
): { mid: Array<number | null>; upper: Array<number | null>; lower: Array<number | null> } {
  const mid = sma(closes, period);
  const sd = stddev(closes, period);
  const upper: Array<number | null> = closes.map((_, i) =>
    mid[i] != null && sd[i] != null ? (mid[i] as number) + mult * (sd[i] as number) : null
  );
  const lower: Array<number | null> = closes.map((_, i) =>
    mid[i] != null && sd[i] != null ? (mid[i] as number) - mult * (sd[i] as number) : null
  );
  return { mid, upper, lower };
}

function rsi(closes: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  gain /= period;
  loss /= period;

  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }

  return out;
}

function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): { signal: Array<number | null>; hist: Array<number | null> } {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  const macdLine: Array<number | null> = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? (emaFast[i] as number) - (emaSlow[i] as number) : null
  );

  // compact values for signal EMA
  const vals: number[] = [];
  const idxs: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      vals.push(macdLine[i] as number);
      idxs.push(i);
    }
  }
  const sigCompact = ema(vals, signal);

  const sig: Array<number | null> = new Array(closes.length).fill(null);
  for (let j = 0; j < sigCompact.length; j++) {
    const idx = idxs[j];
    sig[idx] = sigCompact[j];
  }

  const hist: Array<number | null> = closes.map((_, i) =>
    macdLine[i] != null && sig[i] != null ? (macdLine[i] as number) - (sig[i] as number) : null
  );

  return { signal: sig, hist };
}

function stochasticKDJ(
  highs: number[],
  lows: number[],
  closes: number[],
  n = 9
): { K: Array<number | null>; D: Array<number | null>; J: Array<number | null> } {
  const rsv: Array<number | null> = new Array(closes.length).fill(null);

  for (let i = n - 1; i < closes.length; i++) {
    const hh = Math.max(...highs.slice(i - n + 1, i + 1));
    const ll = Math.min(...lows.slice(i - n + 1, i + 1));
    const denom = hh - ll;
    rsv[i] = denom === 0 ? 50 : ((closes[i] - ll) / denom) * 100;
  }

  const K: Array<number | null> = new Array(closes.length).fill(null);
  const D: Array<number | null> = new Array(closes.length).fill(null);
  let kPrev = 50;
  let dPrev = 50;

  for (let i = 0; i < closes.length; i++) {
    if (rsv[i] == null) continue;
    kPrev = (2 / 3) * kPrev + (1 / 3) * (rsv[i] as number);
    dPrev = (2 / 3) * dPrev + (1 / 3) * kPrev;
    K[i] = kPrev;
    D[i] = dPrev;
  }

  const J: Array<number | null> = closes.map((_, i) =>
    K[i] != null && D[i] != null ? 3 * (K[i] as number) - 2 * (D[i] as number) : null
  );

  return { K, D, J };
}

function stochRsi(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14
): { K: Array<number | null>; D: Array<number | null> } {
  const r = rsi(closes, rsiPeriod);
  const stoch: Array<number | null> = new Array(closes.length).fill(null);

  for (let i = 0; i < closes.length; i++) {
    if (r[i] == null) continue;
    const start = Math.max(0, i - stochPeriod + 1);
    const window = r.slice(start, i + 1).filter((x): x is number => x != null);
    if (window.length < stochPeriod) continue;
    const minV = Math.min(...window);
    const maxV = Math.max(...window);
    const denom = maxV - minV;
    stoch[i] = denom === 0 ? 0 : (((r[i] as number) - minV) / denom) * 100;
  }

  // smooth K and D (SMA 3)
  const k = sma(stoch.map((x) => (x == null ? NaN : x)).filter((x) => Number.isFinite(x)) as number[], 3);
  const d = sma(k.map((x) => (x == null ? NaN : x)).filter((x) => Number.isFinite(x)) as number[], 3);

  const K: Array<number | null> = new Array(closes.length).fill(null);
  const D: Array<number | null> = new Array(closes.length).fill(null);

  // map back using non-null indices
  const idxs: number[] = [];
  for (let i = 0; i < stoch.length; i++) if (stoch[i] != null) idxs.push(i);

  for (let j = 0; j < k.length; j++) {
    const idx = idxs[j];
    K[idx] = k[j];
  }
  const kIdxs = idxs.filter((idx) => K[idx] != null);
  for (let j = 0; j < d.length; j++) {
    const idx = kIdxs[j];
    D[idx] = d[j];
  }

  return { K, D };
}

/** Convert indicator arrays to lightweight-charts LineData, skipping nulls */
function toLineData(times: UTCTimestamp[], values: Array<number | null>): LineData<UTCTimestamp>[] {
  const out: LineData<UTCTimestamp>[] = [];
  for (let i = 0; i < times.length; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) continue;
    out.push({ time: times[i], value: v });
  }
  return out;
}

export function BinanceLikeChart({
  symbolPair,
  interval = "1m",
  theme = "dark",
  onPrice,
  heightPx = 520,
  className,
  historyLimit = 300,
  fitOnFirstLoad = true,
  devPolling = false,
  devPollingMs = 2500,
  showToolbar = true,
  indicatorHeightPx = 140,
}: Props) {
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const indicatorContainerRef = useRef<HTMLDivElement | null>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const indChartRef = useRef<IChartApi | null>(null);

  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // overlays (main)
  const ma7Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma25Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema9Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMidRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpRef = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLoRef = useRef<ISeriesApi<"Line"> | null>(null);

  // indicator pane series (ind chart)
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<"Line"> | null>(null);
  const kdjKRef = useRef<ISeriesApi<"Line"> | null>(null);
  const kdjDRef = useRef<ISeriesApi<"Line"> | null>(null);
  const kdjJRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochKRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stochDRef = useRef<ISeriesApi<"Line"> | null>(null);

  const roMainRef = useRef<ResizeObserver | null>(null);
  const roIndRef = useRef<ResizeObserver | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // keep callbacks stable
  const onPriceRef = useRef<Props["onPrice"]>(onPrice);
  useEffect(() => {
    onPriceRef.current = onPrice;
  }, [onPrice]);

  const [isReady, setIsReady] = useState(false);
  const [debugLog, setDebugLog] = useState<string>("init");
  const lastHistoryKeyRef = useRef<string>("");

  // local state: toggles
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [showVol, setShowVol] = useState(true);

  const [showMA7, setShowMA7] = useState(false);
  const [showMA25, setShowMA25] = useState(false);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showEMA50, setShowEMA50] = useState(false);
  const [showEMA200, setShowEMA200] = useState(false);
  const [showBB, setShowBB] = useState(false);

  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showKDJ, setShowKDJ] = useState(false);
  const [showStochRSI, setShowStochRSI] = useState(false);

  const showIndicatorPane = showRSI || showMACD || showKDJ || showStochRSI;

  // store candle array for recalculations
  const candlesDataRef = useRef<CandlestickData<UTCTimestamp>[]>([]);
  const volumeDataRef = useRef<HistogramData<UTCTimestamp>[]>([]);

  const pairUpper = useMemo(() => symbolPair.toUpperCase(), [symbolPair]);
  const pairLower = useMemo(() => symbolPair.toLowerCase(), [symbolPair]);

  const wsUrl = useMemo(() => {
    const stream = `${pairLower}@kline_${interval}`;
    return `wss://stream.binance.com/stream?streams=${stream}`;
  }, [pairLower, interval]);

  const restHistoryUrl = useMemo(() => {
    return `https://api.binance.com/api/v3/klines?symbol=${pairUpper}&interval=${interval}&limit=${historyLimit}`;
  }, [pairUpper, interval, historyLimit]);

  useEffect(() => {
    setDidFitOnce(false);
  }, [pairUpper, interval]);

  const [didFitOnce, setDidFitOnce] = useState(false);
  const [retryInit, setRetryInit] = useState(0);
  useEffect(() => {
    setDidFitOnce(false);
  }, [pairUpper, interval]);

  /** Create MAIN chart once */
  useEffect(() => {
    const mainEl = mainContainerRef.current;
    if (!mainEl) {
      setDebugLog("no mainEl");
      const t = setTimeout(() => setRetryInit(prev => prev + 1), 200);
      return () => clearTimeout(t);
    }

    setDebugLog("creating chart");

    // cleanup for hot reload (double safety)
    if (mainChartRef.current) {
      try { mainChartRef.current.remove(); } catch { }
      mainChartRef.current = null;
    }

    const isDark = theme === "dark";
    const bg = isDark ? "#0b0e11" : "#ffffff";
    const text = isDark ? "rgba(234,236,239,0.9)" : "rgba(0,0,0,0.75)";
    const grid = isDark ? "rgba(234,236,239,0.06)" : "rgba(0,0,0,0.06)";
    const border = isDark ? "rgba(234,236,239,0.12)" : "rgba(0,0,0,0.12)";
    const cross = isDark ? "rgba(234,236,239,0.25)" : "rgba(0,0,0,0.25)";

    const mainChart = createChart(mainEl, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text, fontSize: 12 },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: "transparent", scaleMargins: { top: 0.12, bottom: 0.25 } },
      timeScale: {
        borderColor: "transparent",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (t: number | string) =>
          new Date((t as number) * 1000).toLocaleTimeString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          }),
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: cross, width: 1 },
        horzLine: { color: cross, width: 1 },
      },
      handleScroll: true,
      handleScale: true,
      width: mainEl.clientWidth || 1,
      height: mainEl.clientHeight || 1,
      localization: {
        timeFormatter: (t: number | string) =>
          new Date((t as number) * 1000).toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }),
      },
    });

    const candles = mainChart.addSeries(CandlestickSeries, {
      upColor: "#0ECB81",
      downColor: "#F6465D",
      borderUpColor: "#0ECB81",
      borderDownColor: "#F6465D",
      wickUpColor: "#0ECB81",
      wickDownColor: "#F6465D",
    });

    const line = mainChart.addSeries(LineSeries, {
      lineWidth: 2,
      color: isDark ? "rgba(234,236,239,0.85)" : "rgba(0,0,0,0.75)",
    });

    const volume = mainChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const mkLine = (color: string, width = 2) =>
      mainChart.addSeries(LineSeries, {
        color,
        lineWidth: width as any,
        priceLineVisible: false,
        lastValueVisible: false,
      });

    ma7Ref.current = mkLine("rgba(234, 179, 8, 0.95)", 2);
    ma25Ref.current = mkLine("rgba(168, 85, 247, 0.95)", 2);
    ema9Ref.current = mkLine("rgba(59, 130, 246, 0.95)", 2);
    ema21Ref.current = mkLine("rgba(34, 197, 94, 0.95)", 2);
    ema50Ref.current = mkLine("rgba(249, 115, 22, 0.95)", 2);
    ema200Ref.current = mkLine("rgba(239, 68, 68, 0.95)", 2);

    bbMidRef.current = mkLine("rgba(14, 203, 129, 0.65)", 1);
    bbUpRef.current = mkLine("rgba(56, 189, 248, 0.7)", 1);
    bbLoRef.current = mkLine("rgba(56, 189, 248, 0.7)", 1);

    candles.applyOptions({ lastValueVisible: true, priceLineVisible: true });
    line.applyOptions({ lastValueVisible: true, priceLineVisible: true });

    mainChartRef.current = mainChart;
    candleRef.current = candles;
    lineRef.current = line;
    volumeRef.current = volume;

    // ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const node = mainContainerRef.current;
      const c = mainChartRef.current;
      if (!node || !c) return;
      const w = Math.max(1, node.clientWidth);
      const h = Math.max(1, node.clientHeight);
      c.applyOptions({ width: w, height: h });
    });
    ro.observe(mainEl);
    roMainRef.current = ro;

    // Trigger isReady so other effects (history/WS) can start
    setIsReady(true);
    setDebugLog("chart ready");

    // Force resize on next animation frame to ensure layout is complete
    const rafId = requestAnimationFrame(() => {
      const node = mainContainerRef.current;
      const c = mainChartRef.current;
      if (!node || !c) return;
      const w = node.clientWidth || 800;
      const h = node.clientHeight || 400;
      c.resize(w, h);
    });
    // Schedule delayed resizes AFTER the PageTransition animation (400ms) completes
    const timerId1 = setTimeout(() => {
      const node = mainContainerRef.current;
      const c = mainChartRef.current;
      if (!node || !c) return;
      const w = node.clientWidth || 800;
      const h = node.clientHeight || 400;
      if (w > 1 && h > 1) c.resize(w, h);
    }, 450); // just after 400ms animation
    const timerId2 = setTimeout(() => {
      const node = mainContainerRef.current;
      const c = mainChartRef.current;
      if (!node || !c) return;
      const w = node.clientWidth || 800;
      const h = node.clientHeight || 400;
      if (w > 1 && h > 1) c.resize(w, h);
    }, 800); // extra safety

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId1);
      clearTimeout(timerId2);
      try { ro.disconnect(); } catch { }
      try { mainChart.remove(); } catch { }
      mainChartRef.current = null;
      candleRef.current = null;
      lineRef.current = null;
      volumeRef.current = null;
      roMainRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryInit]); // Only re-run on retry, NOT on theme change (applyOptions handles that)

  /** Watch for visibility changes and trigger resize — fixes chart disappearing after navigation */
  useEffect(() => {
    const el = mainContainerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Chart became visible — force resize
            const c = mainChartRef.current;
            const node = mainContainerRef.current;
            if (c && node) {
              const w = node.clientWidth || 800;
              const h = node.clientHeight || 400;
              if (w > 1 && h > 1) c.resize(w, h);
            }
          }
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isReady]);

  /** Create INDICATOR chart once on mount (now that container is stable) */
  useEffect(() => {
    const indEl = indicatorContainerRef.current;

    if (!indEl) return;
    if (indChartRef.current) return; // already created

    const isDark = theme === "dark";
    const bg = isDark ? "#0b0e11" : "#ffffff";
    const text = isDark ? "rgba(234,236,239,0.9)" : "rgba(0,0,0,0.75)";
    const grid = isDark ? "rgba(234,236,239,0.06)" : "rgba(0,0,0,0.06)";
    const border = isDark ? "rgba(234,236,239,0.12)" : "rgba(0,0,0,0.12)";
    const cross = isDark ? "rgba(234,236,239,0.25)" : "rgba(0,0,0,0.25)";

    const indChart = createChart(indEl, {
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text, fontSize: 11 },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: "transparent", scaleMargins: { top: 0.1, bottom: 0.1 }, autoScale: true },
      timeScale: { borderColor: "transparent", timeVisible: false, secondsVisible: false, visible: false },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: cross, width: 1 }, horzLine: { color: cross, width: 1 } },
      handleScroll: true,
      handleScale: true,
      width: indEl.clientWidth || 800,
      height: indEl.clientHeight || 140,
    });

    rsiRef.current = indChart.addSeries(LineSeries, {
      color: "rgba(139, 92, 246, 0.95)",
      lineWidth: 2,
      priceLineVisible: false,
    });

    macdHistRef.current = indChart.addSeries(HistogramSeries, {
      priceFormat: { type: "price" },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdSignalRef.current = indChart.addSeries(LineSeries, {
      color: "rgba(99, 102, 241, 0.95)",
      lineWidth: 2,
      priceLineVisible: false,
    });

    kdjKRef.current = indChart.addSeries(LineSeries, { color: "rgba(236, 72, 153, 0.95)", lineWidth: 2, priceLineVisible: false });
    kdjDRef.current = indChart.addSeries(LineSeries, { color: "rgba(59, 130, 246, 0.95)", lineWidth: 2, priceLineVisible: false });
    kdjJRef.current = indChart.addSeries(LineSeries, { color: "rgba(34, 197, 94, 0.95)", lineWidth: 2, priceLineVisible: false });

    stochKRef.current = indChart.addSeries(LineSeries, { color: "rgba(20, 184, 166, 0.95)", lineWidth: 2, priceLineVisible: false });
    stochDRef.current = indChart.addSeries(LineSeries, { color: "rgba(2, 132, 199, 0.95)", lineWidth: 2, priceLineVisible: false });

    indChartRef.current = indChart;

    setDebugLog("indicator chart ready");

    // ResizeObserver for indicator chart
    if (roIndRef.current) {
      try { roIndRef.current.disconnect(); } catch { }
      roIndRef.current = null;
    }
    const ro = new ResizeObserver(() => {
      const node = indicatorContainerRef.current;
      const c = indChartRef.current;
      if (!node || !c) return;
      c.applyOptions({ width: Math.max(1, node.clientWidth), height: Math.max(1, node.clientHeight) });
    });
    ro.observe(indEl);
    roIndRef.current = ro;

    // sync time scale with main
    const sync = () => {
      const main = mainChartRef.current;
      const ind = indChartRef.current;
      if (!main || !ind) return;
      const range = main.timeScale().getVisibleLogicalRange();
      if (range) ind.timeScale().setVisibleLogicalRange(range);
    };
    mainChartRef.current?.timeScale().subscribeVisibleLogicalRangeChange(sync);

    // push existing indicator data now
    recomputeIndicators();
    // setIsReady(true); // secondary ready for indicators // Moved to a separate effect

    return () => {
      if (indChartRef.current) {
        try { indChartRef.current.remove(); } catch { }
        indChartRef.current = null;
        rsiRef.current = null;
        macdHistRef.current = null;
        macdSignalRef.current = null;
        kdjKRef.current = null;
        kdjDRef.current = null;
        kdjJRef.current = null;
        stochKRef.current = null;
        stochDRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Create once, theme updates handled by applyOptions effect

  /** Apply theme to both charts (without recreating them) */
  useEffect(() => {
    const main = mainChartRef.current;
    const ind = indChartRef.current;

    const isDark = theme === "dark";
    const bg = isDark ? "#0b0e11" : "#ffffff";
    const text = isDark ? "rgba(234,236,239,0.9)" : "rgba(0,0,0,0.75)";
    const grid = isDark ? "rgba(234,236,239,0.06)" : "rgba(0,0,0,0.06)";
    const border = isDark ? "rgba(234,236,239,0.12)" : "rgba(0,0,0,0.12)";
    const cross = isDark ? "rgba(234,236,239,0.25)" : "rgba(0,0,0,0.25)";

    const apply = (c: IChartApi) =>
      c.applyOptions({
        layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
        grid: { vertLines: { color: grid }, horzLines: { color: grid } },
        rightPriceScale: { borderColor: "transparent" },
        timeScale: { borderColor: "transparent" },
        crosshair: { vertLine: { color: cross, width: 1 }, horzLine: { color: cross, width: 1 } },
      });

    if (main) apply(main);
    if (ind) apply(ind);

    // Update line series color to contrast with background
    lineRef.current?.applyOptions({
      color: isDark ? "rgba(234,236,239,0.85)" : "rgba(0,0,0,0.75)",
    });
  }, [theme]);

  /** Chart type toggles: show/hide series */
  useEffect(() => {
    candleRef.current?.applyOptions({ visible: chartType === "candle" });
    lineRef.current?.applyOptions({ visible: chartType === "line" });
  }, [chartType]);

  /** Volume toggle */
  useEffect(() => {
    volumeRef.current?.applyOptions({ visible: showVol });
  }, [showVol]);

  /** Overlay toggles */
  useEffect(() => {
    ma7Ref.current?.applyOptions({ visible: showMA7 });
    ma25Ref.current?.applyOptions({ visible: showMA25 });
    ema9Ref.current?.applyOptions({ visible: showEMA9 });
    ema21Ref.current?.applyOptions({ visible: showEMA21 });
    ema50Ref.current?.applyOptions({ visible: showEMA50 });
    ema200Ref.current?.applyOptions({ visible: showEMA200 });
    bbMidRef.current?.applyOptions({ visible: showBB });
    bbUpRef.current?.applyOptions({ visible: showBB });
    bbLoRef.current?.applyOptions({ visible: showBB });
  }, [showMA7, showMA25, showEMA9, showEMA21, showEMA50, showEMA200, showBB]);

  /** Indicator toggles (series may be null until chart created) */
  useEffect(() => {
    rsiRef.current?.applyOptions({ visible: showRSI });
    macdHistRef.current?.applyOptions({ visible: showMACD });
    macdSignalRef.current?.applyOptions({ visible: showMACD });
    kdjKRef.current?.applyOptions({ visible: showKDJ });
    kdjDRef.current?.applyOptions({ visible: showKDJ });
    kdjJRef.current?.applyOptions({ visible: showKDJ });
    stochKRef.current?.applyOptions({ visible: showStochRSI });
    stochDRef.current?.applyOptions({ visible: showStochRSI });

    if (showIndicatorPane) {
      recomputeIndicators();
      // Force resize to ensure it doesn't stay 0x0
      setTimeout(() => {
        const node = indicatorContainerRef.current;
        if (node && indChartRef.current) {
          indChartRef.current.resize(node.clientWidth || 1, node.clientHeight || 1);
        }
      }, 50);
    }
  }, [showRSI, showMACD, showKDJ, showStochRSI, showIndicatorPane]);

  /** Recalculate and push indicator data */
  function recomputeIndicators() {
    const candles = candlesDataRef.current;
    if (!candles.length) return;

    const times = candles.map((c) => c.time);
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    // line close
    lineRef.current?.setData(candles.map((c) => ({ time: c.time, value: c.close })));

    // MA/EMA
    ma7Ref.current?.setData(toLineData(times, sma(closes, 7)));
    ma25Ref.current?.setData(toLineData(times, sma(closes, 25)));
    ema9Ref.current?.setData(toLineData(times, ema(closes, 9)));
    ema21Ref.current?.setData(toLineData(times, ema(closes, 21)));
    ema50Ref.current?.setData(toLineData(times, ema(closes, 50)));
    ema200Ref.current?.setData(toLineData(times, ema(closes, 200)));

    // BB
    const bb = bollinger(closes, 20, 2);
    bbMidRef.current?.setData(toLineData(times, bb.mid));
    bbUpRef.current?.setData(toLineData(times, bb.upper));
    bbLoRef.current?.setData(toLineData(times, bb.lower));

    // RSI
    const rsiValues = rsi(closes, 14);
    rsiRef.current?.setData(toLineData(times, rsiValues));

    // MACD (hist + signal)
    const m = macd(closes, 12, 26, 9);
    macdSignalRef.current?.setData(toLineData(times, m.signal));
    const histData: HistogramData<UTCTimestamp>[] = [];
    for (let i = 0; i < times.length; i++) {
      const v = m.hist[i];
      if (v == null || !Number.isFinite(v)) continue;
      histData.push({
        time: times[i],
        value: v,
        color: v >= 0 ? "rgba(14, 203, 129, 0.55)" : "rgba(246, 70, 93, 0.55)",
      });
    }
    macdHistRef.current?.setData(histData);

    // KDJ
    const kdj = stochasticKDJ(highs, lows, closes, 9);
    kdjKRef.current?.setData(toLineData(times, kdj.K));
    kdjDRef.current?.setData(toLineData(times, kdj.D));
    kdjJRef.current?.setData(toLineData(times, kdj.J));

    // Stoch RSI
    const sr = stochRsi(closes, 14, 14);
    stochKRef.current?.setData(toLineData(times, sr.K));
    stochDRef.current?.setData(toLineData(times, sr.D));

    // --- NEW: Export latest values to window for trade capture ---
    const lastIdx = times.length - 1;
    if (lastIdx >= 0) {
      (window as any).lastRSI = rsiValues[lastIdx];
      (window as any).lastMACD = {
        macd: (m.signal[lastIdx] || 0) + (m.hist[lastIdx] || 0), // approx MACD line
        signal: m.signal[lastIdx] || 0,
        hist: m.hist[lastIdx] || 0
      };
      // For MA7/MA25
      const ma7Values = sma(closes, 7);
      const ma25Values = sma(closes, 25);
      (window as any).lastMA7 = ma7Values[lastIdx];
      (window as any).lastMA25 = ma25Values[lastIdx];
    }
  }

  /** Load history */
  useEffect(() => {
    const main = mainChartRef.current;
    const candles = candleRef.current;
    const vol = volumeRef.current;
    if (!main || !candles || !vol || !isReady) return;

    const key = restHistoryUrl;
    if (lastHistoryKeyRef.current === key) return;
    lastHistoryKeyRef.current = key;

    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(restHistoryUrl, { signal: ac.signal });
        if (!res.ok) throw new Error("history fetch failed");
        const klines = (await res.json()) as any[];
        if (ac.signal.aborted) return;

        const ts = main.timeScale();
        const prevRange: LogicalRange | null = ts.getVisibleLogicalRange();

        const candleData = klines.map(toCandleFromKlineArr);
        const volumeData = klines.map(toVolumeFromKlineArr);

        candlesDataRef.current = candleData;
        volumeDataRef.current = volumeData;

        candles.setData(candleData);
        vol.setData(volumeData);

        recomputeIndicators();

        const last = candleData[candleData.length - 1];
        if (last) onPriceRef.current?.(last.close);

        if (fitOnFirstLoad && !didFitOnce) {
          setTimeout(() => {
            if (mainChartRef.current) {
              const timeScale = mainChartRef.current.timeScale();
              const total = candleData.length;
              if (total > 100) {
                // Zoom in on the last 100 candles for a "professional" look
                timeScale.setVisibleLogicalRange({
                  from: total - 100,
                  to: total + 5, // add a few empty candles of padding to the right
                });
              } else {
                timeScale.fitContent();
              }
            }
          }, 50);
          setDidFitOnce(true);
        } else if (prevRange) {
          ts.setVisibleLogicalRange(prevRange);
        }
      } catch {
        // ignore
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restHistoryUrl, fitOnFirstLoad, isReady]);

  /** helper: stop WS */
  const stopWsIfAny = () => {
    const ws = wsRef.current;
    if (!ws) return;
    try {
      if (ws.readyState === 0) { // CONNECTING
        ws.onopen = () => ws.close(1000, "cleanup");
      } else {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close(1000, "cleanup");
      }
    } catch { }
    wsRef.current = null;
  };

  /** Update last candle or append */
  const pushRealtime = (candle: CandlestickData<UTCTimestamp>, vol: HistogramData<UTCTimestamp>) => {
    const candlesSeries = candleRef.current;
    const volSeries = volumeRef.current;
    if (!candlesSeries || !volSeries) return;

    const buf = candlesDataRef.current.slice();
    const vbuf = volumeDataRef.current.slice();

    if (buf.length === 0) {
      candlesDataRef.current = [candle];
      volumeDataRef.current = [vol];
      candlesSeries.setData([candle]);
      volSeries.setData([vol]);
      recomputeIndicators();
      return;
    }

    const last = buf[buf.length - 1];
    if (last.time === candle.time) {
      buf[buf.length - 1] = candle;
      vbuf[vbuf.length - 1] = vol;
    } else if (last.time < candle.time) {
      buf.push(candle);
      vbuf.push(vol);
      const max = Math.max(200, historyLimit);
      if (buf.length > max) {
        buf.splice(0, buf.length - max);
        vbuf.splice(0, vbuf.length - max);
      }
    } else {
      return;
    }

    candlesDataRef.current = buf;
    volumeDataRef.current = vbuf;

    candlesSeries.update(candle);
    volSeries.update(vol);

    recomputeIndicators();
  };

  /** Realtime: WS / dev polling */
  useEffect(() => {
    if (!isReady) return;
    let alive = true;

    const startPolling = () => {
      let timer: number | null = null;
      const tick = async () => {
        try {
          const url = `https://api.binance.com/api/v3/klines?symbol=${pairUpper}&interval=${interval}&limit=2`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("poll failed");
          const data = (await res.json()) as any[];
          const k = data[data.length - 1];
          if (!alive) return;

          const candle = toCandleFromKlineArr(k);
          const vol = toVolumeFromKlineArr(k);

          pushRealtime(candle, vol);
          onPriceRef.current?.(candle.close);
        } catch {
          // ignore
        } finally {
          if (!alive) return;
          timer = window.setTimeout(tick, devPollingMs);
        }
      };

      tick();
      return () => {
        if (timer) window.clearTimeout(timer);
      };
    };

    const isDev = (import.meta as any)?.env?.DEV;

    if (isDev && devPolling) {
      stopWsIfAny();
      const stop = startPolling();
      return () => {
        alive = false;
        stop();
      };
    }

    stopWsIfAny();

    let attempt = 0;
    let manualClose = false;

    const connect = async () => {
      if (!alive) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (ev) => {
          if (!alive) return;
          try {
            const payload = JSON.parse(ev.data) as { data?: KlineMsg } | KlineMsg;
            const msg: KlineMsg | undefined =
              (payload as any)?.data?.e === "kline" ? (payload as any).data : (payload as any);

            if (!msg || msg.e !== "kline") return;

            const candle: CandlestickData<UTCTimestamp> = {
              time: Math.floor(msg.k.t / 1000) as UTCTimestamp,
              open: Number(msg.k.o),
              high: Number(msg.k.h),
              low: Number(msg.k.l),
              close: Number(msg.k.c),
            };
            const v: HistogramData<UTCTimestamp> = {
              time: Math.floor(msg.k.t / 1000) as UTCTimestamp,
              value: Number(msg.k.v),
              color:
                Number(msg.k.c) >= Number(msg.k.o)
                  ? "rgba(14, 203, 129, 0.5)"
                  : "rgba(246, 70, 93, 0.5)",
            };

            pushRealtime(candle, v);
            onPriceRef.current?.(candle.close);
          } catch {
            // ignore
          }
        };

        ws.onopen = () => {
          attempt = 0;
        };

        ws.onclose = async () => {
          if (!alive || manualClose) return;
          attempt += 1;
          const delay = Math.min(10000, 400 * Math.pow(2, Math.min(6, attempt)));
          await sleep(delay);
          if (!alive) return;
          connect();
        };

        ws.onerror = () => { };
      } catch {
        attempt += 1;
        const delay = Math.min(10000, 400 * Math.pow(2, Math.min(6, attempt)));
        await sleep(delay);
        if (!alive) return;
        connect();
      }
    };

    connect();

    return () => {
      alive = false;
      manualClose = true;
      stopWsIfAny();
    };
  }, [wsUrl, pairUpper, interval, devPolling, devPollingMs, historyLimit, isReady]);

  const isDark = theme === "dark";
  const wrapperBg = isDark ? "bg-[#0b0e11]" : "bg-transparent";

  const btnBase =
    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all select-none";
  const btnOff = isDark
    ? "border-white/10 text-gray-500 hover:bg-white/5"
    : "border-black/10 text-gray-600 hover:text-gray-900";

  const pill = (on: boolean, onCls: string) =>
    `${btnBase} ${on ? onCls : btnOff}`;

  const mainH = showIndicatorPane ? Math.max(120, heightPx - indicatorHeightPx) : heightPx;

  return (
    <div className={className}>
      <div className={`w-full ${wrapperBg}`}>
        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2 pb-3">
            {/* Chart Type Segmented Control */}
            <div className={`p-1 flex items-center rounded-full border ${isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5"}`}>
              <button
                onClick={() => setChartType("candle")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${chartType === "candle"
                  ? "bg-[#559DD2] text-black shadow-sm"
                  : isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Candle
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${chartType === "line"
                  ? "bg-[#559DD2] text-black shadow-sm"
                  : isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Line
              </button>
            </div>

            <button
              onClick={() => setShowVol((v: boolean) => !v)}
              className={pill(
                showVol,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              VOL
            </button>

            <button
              onClick={() => setShowMA7((v: boolean) => !v)}
              className={pill(
                showMA7,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              MA7
            </button>
            <button
              onClick={() => setShowMA25((v) => !v)}
              className={pill(
                showMA25,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              MA25
            </button>

            <button
              onClick={() => setShowEMA9((v) => !v)}
              className={pill(
                showEMA9,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              EMA9
            </button>
            <button
              onClick={() => setShowEMA21((v) => !v)}
              className={pill(
                showEMA21,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              EMA21
            </button>
            <button
              onClick={() => setShowEMA50((v) => !v)}
              className={pill(
                showEMA50,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              EMA50
            </button>
            <button
              onClick={() => setShowEMA200((v) => !v)}
              className={pill(
                showEMA200,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              EMA200
            </button>
            <button
              onClick={() => setShowBB((v) => !v)}
              className={pill(
                showBB,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              BB
            </button>

            <button
              onClick={() => {
                setShowRSI(!showRSI);
                setShowMACD(false); setShowKDJ(false); setShowStochRSI(false);
              }}
              className={pill(
                showRSI,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              RSI
            </button>
            <button
              onClick={() => {
                setShowMACD(!showMACD);
                setShowRSI(false); setShowKDJ(false); setShowStochRSI(false);
              }}
              className={pill(
                showMACD,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              MACD
            </button>
            <button
              onClick={() => {
                setShowKDJ(!showKDJ);
                setShowRSI(false); setShowMACD(false); setShowStochRSI(false);
              }}
              className={pill(
                showKDJ,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              KDJ
            </button>
            <button
              onClick={() => {
                setShowStochRSI(!showStochRSI);
                setShowRSI(false); setShowMACD(false); setShowKDJ(false);
              }}
              className={pill(
                showStochRSI,
                "border-[#559DD2] bg-[#559DD2] text-black shadow-sm"
              )}
            >
              STOCH RSI
            </button>
          </div>
        )}

        <div className="w-full relative" style={{ height: `${mainH}px` }}>
          <div ref={mainContainerRef} className="w-full h-full" />
        </div>

        <div
          className="w-full mt-3 border-t border-[var(--border)]"
          style={{
            height: showIndicatorPane ? indicatorHeightPx : 0,
            visibility: showIndicatorPane ? "visible" : "hidden",
            overflow: "hidden",
            transition: "height 0.2s ease-out"
          }}
        >
          <div ref={indicatorContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
