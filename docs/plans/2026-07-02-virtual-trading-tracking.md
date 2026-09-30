# GA4 Tracking for Virtual Trading Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement Google Analytics (GA4) event tracking for the navigation menu clicks, buy/sell transaction clicks, successful buy/sell orders, and active user duration on the virtual trading page.

**Architecture:** Create a safe, ad-blocker resistant analytics helper utility in `src/lib/analytics.ts`. Integrate it into the navigation handlers in `src/App.tsx` and the trading flow & page lifecycle inside `src/components/PracticeTrading.tsx`.

**Tech Stack:** React 18, TypeScript, Google Analytics 4 (gtag.js)

---

### Task 1: Create Analytics Utility Module

**Files:**
- Create: `src/lib/analytics.ts`
- Test: Verify compilation with build check.

**Step 1: Create the utility file**
Create the new file `src/lib/analytics.ts` with the following content:
```typescript
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
};

export const trackNavClick = (pageId: string, pageLabel: string) => {
  trackEvent('click_nav_virtual_trading', {
    page_id: pageId,
    page_label: pageLabel,
  });
};

export const trackTradeClick = (side: 'buy' | 'sell', symbol: string, amount: number) => {
  trackEvent('click_virtual_trade_button', {
    trade_side: side,
    coin_symbol: symbol,
    requested_amount: amount,
  });
};

export const trackTradeSuccess = (
  side: 'buy' | 'sell',
  symbol: string,
  amount: number,
  price: number,
  total: number
) => {
  trackEvent('virtual_trade_success', {
    trade_side: side,
    coin_symbol: symbol,
    amount: amount,
    price: price,
    total_value: total,
  });
};

export const trackPageDuration = (pageName: string, durationSeconds: number) => {
  trackEvent('virtual_trading_page_duration', {
    page_name: pageName,
    duration_seconds: durationSeconds,
  });
};
```

**Step 2: Run verification**
Run: `npm run build`
Expected: Compile successfully with no typescript errors in the new file.

---

### Task 2: Track Nav Button Clicks in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import tracking function**
Add import at the top of `src/App.tsx`:
```typescript
import { trackNavClick } from './lib/analytics';
```

**Step 2: Integrate in desktop navigation**
Locate the navigation `.map` block (around line 343-363) and update the `onClick` event:
```typescript
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id as Page);
                              if (item.id === 'trading') {
                                trackNavClick('trading', 'Giao dịch ảo');
                              }
                            }}
```

**Step 3: Integrate in mobile navigation**
Locate the mobile navigation `.map` block (around line 464-475) and update the `onClick` event:
```typescript
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id as Page);
                              setShowMobileMenu(false);
                              if (item.id === 'trading') {
                                trackNavClick('trading', 'Giao dịch ảo');
                              }
                            }}
```

**Step 4: Run build check**
Run: `npm run build`
Expected: Passes successfully.

---

### Task 3: Track Trade Clicks and Trade Success in PracticeTrading.tsx

**Files:**
- Modify: `src/components/PracticeTrading.tsx`

**Step 1: Import tracking functions**
Add import at the top of `src/components/PracticeTrading.tsx`:
```typescript
import { trackTradeClick, trackTradeSuccess } from '../lib/analytics';
```

**Step 2: Track click event at start of handleTrade**
Locate `handleTrade` (around line 348) and insert click tracking:
```typescript
  const handleTrade = async () => {
    let amount = parseFloat(tradeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotification('Vui lòng nhập số lượng hợp lệ', 'error');
      return;
    }

    const price = livePrice || 0;
    if (price <= 0) {
      showNotification('Chưa nhận được giá từ Binance', 'error');
      return;
    }

    // Ghi nhận click nút mua bán (Ý định giao dịch)
    trackTradeClick(tradeType, selectedCoin.symbol, amount);
```

**Step 3: Track buy success**
Locate the end of the `buy` flow inside `handleTrade` (around line 394-395) and add `trackTradeSuccess`:
```typescript
      onBuy(selectedCoin.id, amount, price);
      trackTradeSuccess('buy', selectedCoin.symbol, amount, price, total);
      showNotification(`Đã mua thành công ${amount} ${selectedCoin.symbol}`, 'success');
```

**Step 4: Track sell success**
Locate the end of the `sell` flow inside `handleTrade` (around line 417-418) and add `trackTradeSuccess`:
```typescript
      onSell(selectedCoin.id, amount, price);
      trackTradeSuccess('sell', selectedCoin.symbol, amount, price, totalValue);
      showNotification(`Đã bán thành công ${amount} ${selectedCoin.symbol}`, 'success');
```
*Note: Ensure you calculate `totalValue = amount * price` before using it in the event.*

**Step 5: Run build check**
Run: `npm run build`
Expected: Compile successfully.

---

### Task 4: Track Page Duration in PracticeTrading.tsx

**Files:**
- Modify: `src/components/PracticeTrading.tsx`

**Step 1: Import trackPageDuration function**
(Already imported in Task 3)

**Step 2: Add useEffect for duration tracking**
Add the `useEffect` inside `PracticeTrading` component body (around line 315-320):
```typescript
  useEffect(() => {
    const startTime = Date.now();

    const sendDurationLog = () => {
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000);
      if (durationSeconds >= 1) {
        trackPageDuration('trading', durationSeconds);
      }
    };

    window.addEventListener('beforeunload', sendDurationLog);

    return () => {
      window.removeEventListener('beforeunload', sendDurationLog);
      sendDurationLog();
    };
  }, []);
```

**Step 3: Run build check**
Run: `npm run build`
Expected: Compile successfully.
