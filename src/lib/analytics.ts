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
