const API_URL = '';

export async function apiRequest(endpoint: string, method: string = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export const authApi = {
  register: (data: any) => apiRequest('/auth/register', 'POST', data),
  login: (data: any) => apiRequest('/auth/login', 'POST', data),
  googleLogin: (data: any) => apiRequest('/auth/google-login', 'POST', data),
  upgradePro: (data: { email: string; months?: number; amount?: number; method?: string; memo?: string }) => apiRequest('/auth/upgrade-pro', 'POST', data),
  getAdminAnalytics: (email: string) => apiRequest('/auth/admin/analytics', 'POST', { email }),
  createPaymentIntent: (data: { email: string; months: number; amount: number; memo: string }) => apiRequest('/auth/create-payment-intent', 'POST', data),
  checkPaymentStatus: (memo: string) => apiRequest(`/auth/check-payment-status?memo=${memo}`, 'GET'),
  pausePro: (email: string) => apiRequest('/auth/pause-pro', 'POST', { email }),
  resumePro: (email: string) => apiRequest('/auth/resume-pro', 'POST', { email }),
};

export const tradingApi = {
  placeOrder: (data: any) => apiRequest('/trading/order', 'POST', data),
  analyzeBehavior: (userId: string) => apiRequest(`/trading/analyze?userId=${userId}`, 'GET'),
  getLeaderboard: () => apiRequest('/trading/leaderboard', 'GET'),
};

export const aiApi = {
  marketAnalysis: (symbol: string, coinName: string) =>
    apiRequest(`/ai/market-analysis?symbol=${symbol}&coinName=${encodeURIComponent(coinName)}`, 'GET'),
};

export const communityApi = {
  getPosts: (category?: string, filter?: string) => {
    let query = '';
    const params = [];
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (filter) params.push(`filter=${encodeURIComponent(filter)}`);
    if (params.length > 0) query = `?${params.join('&')}`;
    return apiRequest(`/community${query}`, 'GET');
  },
  getSidebarData: () => apiRequest('/community/sidebar', 'GET'),
  createPost: (data: { userId: string; title: string; content: string; category?: string }) =>
    apiRequest('/community', 'POST', data),
  toggleLike: (postId: number, userId: string) =>
    apiRequest('/community/like', 'POST', { postId, userId }),
  addComment: (postId: number, userId: string, content: string) =>
    apiRequest('/community/comment', 'POST', { postId, userId, content }),
};

