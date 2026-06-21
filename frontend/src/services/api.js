import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const stockService = {
  searchStocks: (query, market) => 
    api.get('/stocks/search', { params: { q: query, market } }),

  searchKrStocks: (query) =>
    api.get('/stocks/search/kr', { params: { q: query } }),

  searchUsStocks: (query) =>
    api.get('/stocks/search/us', { params: { q: query } }),
  
  getStockList: (market, limit = 50) =>
    api.get(`/stocks/list/${market}`, { params: { limit } }),
  
  getStockPrice: (symbol, market = 'US') =>
    api.get(`/stocks/price/${symbol}`, { params: { market } }),
  
  getStockHistory: (symbol, market = 'US', period = '1y') =>
    api.get(`/stocks/history/${symbol}`, { params: { market, period } }),

  getExchangeRate: (base = 'USD', quote = 'KRW') =>
    api.get('/stocks/exchange-rate', { params: { base, quote } }),

  getBollingerRecommendations: (market = 'KR', limit = 6, options = {}) =>
    api.get('/stocks/recommendations/bollinger', { params: { market, limit, ...options } }),
  
  getStockInfo: (symbol, market = 'US') =>
    api.get(`/stocks/${symbol}/info`, { params: { market } }),
};

export const portfolioService = {
  createPortfolio: (userId, name, initialBalance) =>
    api.post('/portfolio/', { user_id: userId, name, initial_balance: initialBalance }),
  
  getPortfolio: (userId) =>
    api.get(`/portfolio/${userId}/`),
  
  getPortfolioStats: (userId) =>
    api.get(`/portfolio/${userId}/stats/`),
  
  getHoldings: (userId) =>
    api.get(`/portfolio/${userId}/holdings/`),
};

export const tradeService = {
  executeBuy: (portfolioId, stockId, quantity, price, commission = 0) =>
    api.post('/trade/buy/', { portfolio_id: portfolioId, stock_id: stockId, quantity, price, commission }),
  
  executeSell: (portfolioId, stockId, quantity, price, commission = 0) =>
    api.post('/trade/sell/', { portfolio_id: portfolioId, stock_id: stockId, quantity, price, commission }),
  
  getTradeHistory: (portfolioId, limit = 50) =>
    api.get(`/trade/${portfolioId}/history/`, { params: { limit } }),
};

export default api;
