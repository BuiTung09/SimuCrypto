import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderService } from '../ai/ai-provider.service';

interface EnrichedTrade {
  side: string;
  pair: string;
  price: number;
  quantity: number;
  total: number;
  context: any;
  time: Date;
  timeSinceLastTradeMins: number | null;
  idx: number;
}

export interface NotableTrade {
  label: string;       // e.g. "FOMO nặng", "Đỉnh cao nhất"
  side: string;
  pair: string;
  price: number;
  quantity: number;
  total: number;
  rsi: number | null;
  trend: string | null;
  macdHist: number | null;
  time: string;
  why: string;         // explanation
  severity: 'critical' | 'warning' | 'good';
}

@Injectable()
export class BehavioralAnalysisService {
  constructor(
    private prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
  ) {}

  async analyzeUserBehavior(userId: string) {
    const account = await this.prisma.portfolioAccount.findUnique({
      where: { userId },
      include: {
        trades: { orderBy: { executedAt: 'desc' }, take: 50 },
      },
    });

    if (!account || !account.trades.length) {
      return { error: 'Chưa có đủ dữ liệu giao dịch để phân tích. Hãy thực hiện ít nhất 3 giao dịch!' };
    }

    const rawTrades = account.trades.map((t) => ({
      side: t.side,
      pair: t.pairSymbol,
      price: t.price.toNumber(),
      quantity: t.quantity.toNumber(),
      total: t.totalValue.toNumber(),
      context: (t as any).marketContext ?? null,
      time: t.executedAt,
    }));

    const sorted = [...rawTrades].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const enriched: EnrichedTrade[] = sorted.map((t, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const diffMins = prev
        ? (new Date(t.time).getTime() - new Date(prev.time).getTime()) / 60000
        : null;
      return { ...t, timeSinceLastTradeMins: diffMins, idx };
    });

    // ── Helper formatters ──────────────────────────────────────────
    const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 4 });
    const fmtTime = (d: Date) => {
      const dt = new Date(d);
      return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')} ${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`;
    };
    const rsiOf = (t: EnrichedTrade): number | null => t.context?.rsi ?? null;
    const macdOf = (t: EnrichedTrade): number | null => t.context?.macd?.hist ?? null;
    const trendOf = (t: EnrichedTrade): string | null => t.context?.trend ?? null;

    // ── Rule detections ────────────────────────────────────────────
    const fomoTrades = enriched.filter(t => t.side === 'buy' && (rsiOf(t) ?? 0) > 68);
    const oversoldBuys = enriched.filter(t => t.side === 'buy' && (rsiOf(t) ?? 100) < 35);
    const overtrades = enriched.filter(t => t.timeSinceLastTradeMins !== null && t.timeSinceLastTradeMins < 5);
    const revengeList: EnrichedTrade[] = [];
    for (let i = 1; i < enriched.length; i++) {
      if (enriched[i-1].side === 'sell' && enriched[i].timeSinceLastTradeMins !== null && enriched[i].timeSinceLastTradeMins! < 10) {
        revengeList.push(enriched[i]);
      }
    }
    // Counter-trend sells: SELL into bearish RSI < 35 (panic sell at bottom)
    const panicSells = enriched.filter(t => t.side === 'sell' && (rsiOf(t) ?? 100) < 35);
    // Good sells: SELL when RSI > 65
    const goodSells = enriched.filter(t => t.side === 'sell' && (rsiOf(t) ?? 0) > 65);
    // Trend-aligned buys (bullish context + RSI 40-60)
    const trendAlignedBuys = enriched.filter(t =>
      t.side === 'buy' &&
      trendOf(t) === 'bullish' &&
      (rsiOf(t) ?? 0) >= 40 && (rsiOf(t) ?? 0) <= 60
    );

    // ── Win/Loss P&L per pair ──────────────────────────────────────
    const pnlData = this.calcDetailedPnL(enriched);

    // ── Scoring ───────────────────────────────────────────────────
    let score = 100;
    score -= fomoTrades.length * 10;
    score -= overtrades.length * 7;
    score -= revengeList.length * 15;
    score -= panicSells.length * 8;
    score += oversoldBuys.length * 8;
    score += goodSells.length * 6;
    score += trendAlignedBuys.length * 5;
    if (pnlData.winRate > 0.6) score += 10;
    else if (pnlData.winRate < 0.4 && pnlData.total >= 3) score -= 10;
    score = Math.max(0, Math.min(100, score));

    // ── Notable trades (most important specific examples) ──────────
    const notableTrades: NotableTrade[] = [];

    // FOMO examples — worst RSI
    const worstFomo = [...fomoTrades].sort((a, b) => (rsiOf(b) ?? 0) - (rsiOf(a) ?? 0)).slice(0, 2);
    for (const t of worstFomo) {
      const rsi = rsiOf(t);
      notableTrades.push({
        label: `⚠️ FOMO — Mua đỉnh`,
        side: t.side,
        pair: t.pair,
        price: t.price,
        quantity: t.quantity,
        total: t.total,
        rsi,
        trend: trendOf(t),
        macdHist: macdOf(t),
        time: fmtTime(t.time),
        why: `Bạn MUA ${t.pair} lúc RSI = ${rsi?.toFixed(1)} (vùng quá mua >68). Giá $${fmt(t.price)}, tổng $${fmt(t.total)}. Đây là lệnh đu đỉnh điển hình khi thị trường đã nóng quá, rủi ro đảo chiều rất cao.`,
        severity: (rsi ?? 0) > 75 ? 'critical' : 'warning',
      });
    }

    // Revenge trading examples
    for (const t of revengeList.slice(0, 2)) {
      notableTrades.push({
        label: `🔴 Revenge Trade`,
        side: t.side,
        pair: t.pair,
        price: t.price,
        quantity: t.quantity,
        total: t.total,
        rsi: rsiOf(t),
        trend: trendOf(t),
        macdHist: macdOf(t),
        time: fmtTime(t.time),
        why: `Lệnh ${t.side.toUpperCase()} ${t.pair} được mở chỉ ${t.timeSinceLastTradeMins?.toFixed(0)} phút sau lệnh trước đó — dấu hiệu rõ của hành vi trả thù thị trường sau khi vừa thực hiện giao dịch trước đó.`,
        severity: 'critical',
      });
    }

    // Panic sell examples
    for (const t of panicSells.slice(0, 1)) {
      notableTrades.push({
        label: `⚠️ Bán Hoảng Loạn`,
        side: t.side,
        pair: t.pair,
        price: t.price,
        quantity: t.quantity,
        total: t.total,
        rsi: rsiOf(t),
        trend: trendOf(t),
        macdHist: macdOf(t),
        time: fmtTime(t.time),
        why: `Bạn BÁN ${t.pair} tại RSI = ${rsiOf(t)?.toFixed(1)} (vùng quá bán <35). Đây có thể là panic sell tại vùng đáy, trong khi RSI thấp lại thường là tín hiệu sắp phục hồi.`,
        severity: 'warning',
      });
    }

    // Best disciplined buys
    const bestBuys = [...oversoldBuys].sort((a, b) => (rsiOf(a) ?? 100) - (rsiOf(b) ?? 100)).slice(0, 1);
    for (const t of bestBuys) {
      notableTrades.push({
        label: `✅ Mua Đáy Xuất Sắc`,
        side: t.side,
        pair: t.pair,
        price: t.price,
        quantity: t.quantity,
        total: t.total,
        rsi: rsiOf(t),
        trend: trendOf(t),
        macdHist: macdOf(t),
        time: fmtTime(t.time),
        why: `Lệnh MUA ${t.pair} tại RSI = ${rsiOf(t)?.toFixed(1)} — đây là điểm vào lệnh kỷ luật, mua khi thị trường đang quá bán và sắp có khả năng phục hồi. Lệnh $${fmt(t.total)}.`,
        severity: 'good',
      });
    }

    // Best good sells (sold near top)
    const bestSell = [...goodSells].sort((a, b) => (rsiOf(b) ?? 0) - (rsiOf(a) ?? 0)).slice(0, 1);
    for (const t of bestSell) {
      notableTrades.push({
        label: `✅ Bán Đỉnh Kỷ Luật`,
        side: t.side,
        pair: t.pair,
        price: t.price,
        quantity: t.quantity,
        total: t.total,
        rsi: rsiOf(t),
        trend: trendOf(t),
        macdOf: macdOf(t),
        time: fmtTime(t.time),
        why: `Bạn BÁN ${t.pair} tại RSI = ${rsiOf(t)?.toFixed(1)} (vùng quá mua) — đây là quyết định sáng suốt, chốt lời gần đỉnh thay vì tham lam giữ thêm.`,
        severity: 'good',
      } as any);
    }

    // Most profitable trade
    if (pnlData.best) {
      const b = pnlData.best;
      notableTrades.push({
        label: `💰 Lệnh Lãi Tốt Nhất`,
        side: 'sell',
        pair: b.pair,
        price: b.sellPrice,
        quantity: b.qty,
        total: b.sellTotal,
        rsi: null,
        trend: null,
        macdHist: null,
        time: b.time,
        why: `Giao dịch ${b.pair} đạt lợi nhuận +$${fmt(b.pnl)} (+${b.pnlPct.toFixed(1)}%). Mua ở $${fmt(b.buyPrice)}, bán ở $${fmt(b.sellPrice)}.`,
        severity: 'good',
      });
    }

    // Worst loss trade
    if (pnlData.worst) {
      const w = pnlData.worst;
      notableTrades.push({
        label: `📉 Lệnh Lỗ Nặng Nhất`,
        side: 'sell',
        pair: w.pair,
        price: w.sellPrice,
        quantity: w.qty,
        total: w.sellTotal,
        rsi: null,
        trend: null,
        macdHist: null,
        time: w.time,
        why: `Giao dịch ${w.pair} lỗ $${fmt(Math.abs(w.pnl))} (${w.pnlPct.toFixed(1)}%). Mua ở $${fmt(w.buyPrice)}, bán ở $${fmt(w.sellPrice)}. Cần phân tích lý do để tránh lặp lại.`,
        severity: 'critical',
      });
    }

    // ── Patterns ──────────────────────────────────────────────────
    const patterns: { name: string; description: string; impact: string }[] = [];

    if (fomoTrades.length > 0) {
      const avgRsiFomo = fomoTrades.reduce((s, t) => s + (rsiOf(t) ?? 0), 0) / fomoTrades.length;
      patterns.push({
        name: `FOMO — ${fomoTrades.length} lệnh đu đỉnh`,
        description: `${fomoTrades.length}/${enriched.filter(t=>t.side==='buy').length} lệnh MUA được thực hiện khi RSI > 68 (trung bình RSI lúc vào = ${avgRsiFomo.toFixed(1)}). Cặp hay bị FOMO nhất: ${this.mostFrequentPair(fomoTrades)}. Hành vi này thường dẫn đến bị kẹp giá sau mỗi đợt pump.`,
        impact: 'Tiêu cực',
      });
    }

    if (overtrades.length > 0) {
      const avgGap = overtrades.reduce((s, t) => s + (t.timeSinceLastTradeMins ?? 0), 0) / overtrades.length;
      patterns.push({
        name: `Overtrading — ${overtrades.length} lệnh vội vàng`,
        description: `${overtrades.length} lệnh được mở dưới 5 phút sau lệnh trước (trung bình cách ${avgGap.toFixed(1)} phút). Hành vi này cho thấy quyết định thiếu tính toán, thường là phản ứng cảm tính với biến động giá ngắn hạn.`,
        impact: 'Tiêu cực',
      });
    }

    if (revengeList.length > 0) {
      patterns.push({
        name: `Revenge Trading — ${revengeList.length} lần gỡ gạc`,
        description: `Phát hiện ${revengeList.length} lần mở lệnh mới trong vòng 10 phút sau lệnh trước. Đây là hành vi nguy hiểm nhất trong trading — cảm xúc chiếm quyền kiểm soát, dễ dẫn đến thua lỗ dây chuyền.`,
        impact: 'Tiêu cực',
      });
    }

    if (panicSells.length > 0) {
      patterns.push({
        name: `Panic Sell — ${panicSells.length} lần bán hoảng`,
        description: `${panicSells.length} lệnh BÁN được thực hiện khi RSI < 35 (vùng quá bán). Bán đáy thường xảy ra khi áp lực tâm lý quá lớn — trong khi đây lại thường là thời điểm thị trường sắp phục hồi.`,
        impact: 'Tiêu cực',
      });
    }

    if (oversoldBuys.length > 0) {
      const avgRsi = oversoldBuys.reduce((s, t) => s + (rsiOf(t) ?? 0), 0) / oversoldBuys.length;
      patterns.push({
        name: `Mua Đáy Kỷ Luật — ${oversoldBuys.length} lệnh`,
        description: `${oversoldBuys.length} lệnh MUA khi RSI < 35 (trung bình RSI = ${avgRsi.toFixed(1)}). Đây là các điểm vào lệnh có tỷ lệ rủi ro/lợi nhuận tốt, cho thấy bạn có khả năng đi ngược đám đông.`,
        impact: 'Tích cực',
      });
    }

    if (goodSells.length > 0) {
      patterns.push({
        name: `Chốt Lời Đúng Lúc — ${goodSells.length} lệnh`,
        description: `${goodSells.length} lệnh BÁN được thực hiện khi RSI > 65 — tín hiệu bạn biết cách chốt lời gần vùng đỉnh thay vì tham lam giữ thêm.`,
        impact: 'Tích cực',
      });
    }

    if (pnlData.total >= 2) {
      const totalPnl = pnlData.totalPnl;
      patterns.push({
        name: `Win Rate ${(pnlData.winRate * 100).toFixed(0)}% | P&L ${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl)}`,
        description: `Từ ${pnlData.total} cặp giao dịch hoàn chỉnh: ${pnlData.wins} thắng / ${pnlData.losses} thua. Tổng P&L: ${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl)} USDT. ${pnlData.winRate >= 0.5 ? 'Tỷ lệ thắng tích cực.' : 'Cần cải thiện điểm vào/ra lệnh.'}`,
        impact: pnlData.winRate >= 0.5 ? 'Tích cực' : 'Tiêu cực',
      });
    }

    // ── Persona ───────────────────────────────────────────────────
    let persona: { title: string; description: string; icon: string };
    if (score >= 80 && fomoTrades.length === 0) {
      persona = { title: 'Sniper Kỷ Luật', description: 'Vào lệnh chuẩn xác, biết chờ đợi đúng thời điểm', icon: 'Target' };
    } else if (fomoTrades.length >= 3) {
      persona = { title: 'Tay Súng FOMO', description: `Đã đu đỉnh ${fomoTrades.length} lần — cần kiềm chế cảm xúc hơn`, icon: 'Zap' };
    } else if (revengeList.length >= 2) {
      persona = { title: 'Kẻ Trả Thù Thị Trường', description: 'Mất bình tĩnh dễ dẫn đến thua lỗ dây chuyền', icon: 'AlertCircle' };
    } else if (overtrades.length >= 4) {
      persona = { title: 'Người Giao Dịch Quá Mức', description: `${overtrades.length} lệnh vội vàng trong cùng phiên`, icon: 'Activity' };
    } else if (panicSells.length >= 2) {
      persona = { title: 'Trader Tâm Lý Yếu', description: 'Dễ bị ảnh hưởng bởi sợ hãi, bán đáy nhiều lần', icon: 'AlertCircle' };
    } else if (oversoldBuys.length >= 2 && score >= 60) {
      persona = { title: 'Người Bắt Đáy Kiên Nhẫn', description: 'Có kỷ luật tốt ở điểm mua, cần cải thiện điểm bán', icon: 'TrendingDown' };
    } else {
      persona = { title: 'Trader Đang Phát Triển', description: 'Đang hình thành phong cách, tiếp tục học hỏi', icon: 'Activity' };
    }

    // ── Evaluation paragraph ──────────────────────────────────────
    const buyCount = enriched.filter(t => t.side === 'buy').length;
    const sellCount = enriched.filter(t => t.side === 'sell').length;
    const mostTradedPair = this.mostFrequentPair(enriched);
    const totalVolume = enriched.reduce((s, t) => s + t.total, 0);

    // Build fallback evaluation (Rule Engine template)
    let evaluation = `Phân tích ${enriched.length} giao dịch gần nhất (${buyCount} lệnh MUA / ${sellCount} lệnh BÁN), tổng khối lượng $${fmt(totalVolume)} USDT. Cặp giao dịch nhiều nhất: ${mostTradedPair}.\n\n`;
    if (fomoTrades.length > 0) evaluation += `🔴 Phát hiện ${fomoTrades.length} lệnh FOMO (RSI > 68 lúc mua) — chiếm ${((fomoTrades.length / buyCount) * 100).toFixed(0)}% tổng lệnh mua. `;
    if (revengeList.length > 0) evaluation += `Có ${revengeList.length} dấu hiệu revenge trading rõ ràng. `;
    if (overtrades.length > 0) evaluation += `${overtrades.length} lệnh được mở quá vội (< 5 phút). `;
    if (oversoldBuys.length > 0) evaluation += `\n\n✅ Điểm sáng: ${oversoldBuys.length} lệnh mua đáy kỷ luật (RSI < 35). `;
    if (goodSells.length > 0) evaluation += `${goodSells.length} lần chốt lời gần đỉnh. `;
    if (pnlData.total >= 2) evaluation += `\n\nWin rate ${(pnlData.winRate * 100).toFixed(0)}% từ ${pnlData.total} cặp giao dịch. Tổng P&L ${pnlData.totalPnl >= 0 ? '+' : ''}$${fmt(pnlData.totalPnl)}.`;
    evaluation += `\n\nĐiểm kỷ luật: ${score}/100.`;

    // Try LLM for richer personalized evaluation
    const behaviorPrompt = `Bạn là chuyên gia tâm lý giao dịch crypto. Viết nhận xét phân tích hành vi giao dịch cá nhân hóa bằng tiếng Việt, dựa trên dữ liệu thực tế sau (KHÔNG bịa thêm số liệu ngoài những gì được cung cấp):

- Tổng giao dịch: ${enriched.length} (${buyCount} mua / ${sellCount} bán)
- Cặp giao dịch nhiều nhất: ${mostTradedPair}
- Tổng khối lượng: $${fmt(totalVolume)} USDT
- Điểm kỷ luật: ${score}/100
- Phong cách: ${persona.title} — ${persona.description}
- FOMO (mua khi RSI > 68): ${fomoTrades.length} lần
- Revenge trading (lệnh mới < 10 phút sau lệnh trước): ${revengeList.length} lần
- Overtrading (lệnh mới < 5 phút): ${overtrades.length} lần
- Panic sell (bán khi RSI < 35): ${panicSells.length} lần
- Mua đáy kỷ luật (mua khi RSI < 35): ${oversoldBuys.length} lần
- Chốt lời đúng lúc (bán khi RSI > 65): ${goodSells.length} lần
- Win rate: ${pnlData.total > 0 ? (pnlData.winRate * 100).toFixed(0) + '%' : 'Chưa có dữ liệu'}
- P&L tổng: ${pnlData.total > 0 ? (pnlData.totalPnl >= 0 ? '+' : '') + '$' + fmt(pnlData.totalPnl) : 'Chưa có dữ liệu'}

Viết 2-3 đoạn văn ngắn, thân thiện nhưng thẳng thắn. Không dùng bullet list, không dùng markdown, không bịa số liệu. Bắt đầu bằng tổng quan, sau đó nêu điểm mạnh, cuối cùng nêu điểm cần cải thiện.`;

    const llmEvaluation = await this.aiProvider.generate(behaviorPrompt, {
      temperature: 0.6,
      maxTokens: 500,
      systemPrompt: 'Bạn là chuyên gia tâm lý giao dịch crypto. Viết tiếng Việt tự nhiên, không dùng markdown.',
    });

    if (llmEvaluation) {
      evaluation = llmEvaluation;
    }

    // ── Advice ────────────────────────────────────────────────────
    const advice: string[] = [];
    if (fomoTrades.length > 0) {
      advice.push(`Với ${fomoTrades.length} lệnh FOMO, hãy đặt nguyên tắc: không MUA khi RSI > 65. Hãy đặt lệnh limit order tại vùng RSI 45-55 thay vì market order theo đà tăng.`);
    }
    if (revengeList.length > 0) {
      advice.push(`Sau mỗi lần giao dịch (thắng hay thua), đặt timer 30 phút trước khi mở lệnh tiếp theo. Rule cứng: không được mở lệnh trong vòng 10 phút sau lệnh trước.`);
    }
    if (overtrades.length > 0) {
      advice.push(`Giới hạn tối đa 3-5 lệnh/ngày. ${overtrades.length} lệnh vội vàng cho thấy bạn đang phản ứng với nhiễu ngắn hạn thay vì giao dịch theo kế hoạch.`);
    }
    if (panicSells.length > 0) {
      advice.push(`${panicSells.length} lần bán đáy (RSI < 35) — khi thấy RSI quá thấp, đây thường là tín hiệu GIỮ hoặc MUA thêm, không phải bán. Hãy đặt stop-loss trước khi vào lệnh để tránh bán cảm tính.`);
    }
    if (pnlData.total >= 2 && pnlData.worst) {
      advice.push(`Lệnh thua lớn nhất (-$${fmt(Math.abs(pnlData.worst.pnl))}) trên ${pnlData.worst.pair}. Hãy phân tích lại context thị trường lúc đó và rút ra bài học để tránh lặp lại.`);
    }
    if (advice.length === 0) {
      advice.push('Kỷ luật giao dịch tốt! Hãy ghi chép lý do vào lệnh mỗi lần để tiếp tục cải thiện.');
      advice.push('Cân nhắc tăng kích thước vị thế tại những điểm mua đáy (RSI < 35) vì đây là điểm mạnh của bạn.');
    }

    return { score, persona, evaluation, summary: evaluation, patterns, advice, notableTrades };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private mostFrequentPair(trades: EnrichedTrade[]): string {
    const count: Record<string, number> = {};
    for (const t of trades) count[t.pair] = (count[t.pair] || 0) + 1;
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
  }

  private calcDetailedPnL(trades: EnrichedTrade[]) {
    const byPair: Record<string, EnrichedTrade[]> = {};
    for (const t of trades) {
      if (!byPair[t.pair]) byPair[t.pair] = [];
      byPair[t.pair].push(t);
    }

    let wins = 0, losses = 0, totalPnl = 0;
    type PnlRecord = { pair: string; buyPrice: number; sellPrice: number; qty: number; buyTotal: number; sellTotal: number; pnl: number; pnlPct: number; time: string };
    let best: PnlRecord | null = null;
    let worst: PnlRecord | null = null;

    for (const pair of Object.keys(byPair)) {
      const pts = byPair[pair].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      let buyPrice: number | null = null;
      let buyQty: number | null = null;
      let buyTotal: number | null = null;

      for (const t of pts) {
        if (t.side === 'buy') {
          buyPrice = t.price;
          buyQty = t.quantity;
          buyTotal = t.total;
        } else if (t.side === 'sell' && buyPrice !== null && buyQty !== null && buyTotal !== null) {
          const pnl = t.total - buyTotal;
          const pnlPct = (pnl / buyTotal) * 100;
          totalPnl += pnl;

          const record = {
            pair,
            buyPrice,
            sellPrice: t.price,
            qty: t.quantity,
            buyTotal,
            sellTotal: t.total,
            pnl,
            pnlPct,
            time: `${new Date(t.time).getDate().toString().padStart(2,'0')}/${(new Date(t.time).getMonth()+1).toString().padStart(2,'0')}`,
          };

          if (pnl >= 0) {
            wins++;
            if (!best || pnl > best.pnl) best = record;
          } else {
            losses++;
            if (!worst || pnl < worst.pnl) worst = record;
          }

          buyPrice = null; buyQty = null; buyTotal = null;
        }
      }
    }

    const total = wins + losses;
    return { wins, losses, total, winRate: total > 0 ? wins / total : 0, totalPnl, best, worst };
  }
}
