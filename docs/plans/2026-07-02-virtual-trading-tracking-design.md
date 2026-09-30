# Thiết kế Đo lường Google Analytics cho Giao dịch ảo

Tài liệu này đặc tả thiết kế kỹ thuật cho việc triển khai theo dõi hành vi người dùng trên trang Giao dịch ảo bằng Google Analytics 4 (GA4).

## Mục tiêu
1. Đo lường lượt click vào nút điều hướng "Giao dịch ảo" trên thanh Menu.
2. Đo lường lượt click vào nút Mua/Bán (ý định giao dịch, bao gồm cả các lệnh lỗi/không đủ số dư).
3. Đo lường số lượt giao dịch Mua/Bán thành công (lệnh khớp và cập nhật số dư thành công).
4. Đo lường thời lượng (giây) thực tế mà người dùng truy cập và hoạt động trên trang Giao dịch ảo.

## Thiết kế Kỹ thuật

### 1. File Tiện ích Analytics (`src/lib/analytics.ts`)
Chúng ta sẽ tạo một file tiện ích để đóng gói các hàm gọi `gtag`. Điều này giúp code giao diện gọn gàng hơn và tránh lỗi runtime nếu GA4 bị chặn bởi trình chặn quảng cáo (Adblocker).

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

### 2. Sự kiện Click Nav (`src/App.tsx`)
Tại thanh điều hướng (cả Desktop và Mobile menu), khi nút có ID `'trading'` được nhấp chuột:
* Gọi hàm `trackNavClick('trading', 'Giao dịch ảo')`.

### 3. Sự kiện Giao dịch (`src/components/PracticeTrading.tsx`)
Trong component `PracticeTrading`:
* Khi nhấn nút đặt lệnh (gọi hàm `handleTrade`):
  * Bắn sự kiện `trackTradeClick(tradeType, selectedCoin.symbol, amount)`.
* Khi giao dịch thành công (ở cuối luồng xử lý mua/bán):
  * Bắn sự kiện `trackTradeSuccess(tradeType, selectedCoin.symbol, amount, price, totalCost)`.

### 4. Theo dõi Thời lượng ở lại trang (`src/components/PracticeTrading.tsx`)
Sử dụng `useEffect` để đếm thời gian khi component mount và unmount hoặc đóng trình duyệt:
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

  // Lắng nghe sự kiện tab/trình duyệt bị tắt hoặc reload
  window.addEventListener('beforeunload', sendDurationLog);

  return () => {
    window.removeEventListener('beforeunload', sendDurationLog);
    sendDurationLog();
  };
}, []);
```

## Kế hoạch Kiểm thử (Verification Plan)
1. Chạy ứng dụng dưới môi trường dev (`npm run dev`).
2. Mở Tab Console của Chrome Developer Tools hoặc GA4 DebugView.
3. Thực hiện chuyển trang để xem sự kiện `click_nav_virtual_trading` và `virtual_trading_page_duration` được ghi lại.
4. Thực hiện thử đặt lệnh lỗi (ví dụ không nhập số lượng) để xem sự kiện `click_virtual_trade_button` được bắn ra.
5. Thực hiện giao dịch mua và bán thành công để xác minh sự kiện `virtual_trade_success` được gửi với các tham số chính xác.
