import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import StockSearch from '../components/StockSearch';
import StockChart from '../components/StockChart';
import { stockService } from '../services/api';
import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatLargeCurrencyText, getCurrencyByMarket } from '../utils';

export default function StockDetails() {
  const [searchParams] = useSearchParams();
  const [selectedStock, setSelectedStock] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [usdKrwRate, setUsdKrwRate] = useState(null);
  const [fxError, setFxError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currency = stockInfo?.currency || getCurrencyByMarket(selectedStock?.market || 'US');

  const getSecondaryPriceText = (value) => {
    if (value === null || value === undefined) return null;

    if (currency === 'USD' && usdKrwRate) {
      const convertedValue = Number(value) * Number(usdKrwRate);
      return `약 ${formatCurrency(convertedValue, 'KRW')} (${formatLargeCurrencyText(convertedValue, 'KRW')})`;
    }

    return `약 ${formatLargeCurrencyText(value, currency)}`;
  };

  const handleSelectStock = async (stock) => {
    setSelectedStock(stock);
    setLoading(true);
    setFxError(null);
    setError(null);

    try {
      const market = stock.market || 'US';
      const stockResponse = await stockService.getStockInfo(stock.symbol, market);
      setStockInfo(stockResponse.data);

      if (market === 'US') {
        try {
          const rateResponse = await stockService.getExchangeRate('USD', 'KRW');
          setUsdKrwRate(rateResponse?.data?.rate || null);
        } catch (rateErr) {
          setUsdKrwRate(null);
          setFxError('환율 정보를 불러오지 못했습니다.');
          console.warn('환율 조회 오류:', rateErr);
        }
      } else {
        setUsdKrwRate(null);
        setFxError(null);
      }
    } catch (error) {
      console.error('주식 정보 조회 오류:', error);
      setStockInfo(null);
      setUsdKrwRate(null);
      setFxError(null);
      setError(error?.response?.data?.error || error.message || '상세 정보 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const symbol = searchParams.get('symbol');
    if (!symbol) return;

    const market = searchParams.get('market') || 'US';
    const name = searchParams.get('name') || symbol;

    handleSelectStock({ symbol, market, name });
    // URL query가 바뀔 때만 자동 조회
  }, [searchParams]);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Stock Search</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">주식 검색 및 분석</h1>
            <p className="mt-2 text-slate-500">한국, 미국 주식을 검색하고 차트를 바로 확인할 수 있습니다.</p>
          </div>
          <div className="rounded-3xl bg-sky-50 px-5 py-4 text-sky-700 shadow-sm">
            <p className="text-sm font-semibold">기능</p>
            <p className="mt-1 text-sm">검색 · 정보 조회 · 차트 분석</p>
          </div>
        </div>

        <div className="mt-8">
          <StockSearch onSelectStock={handleSelectStock} />
        </div>
      </section>

      {selectedStock ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] bg-white p-8 shadow-lg shadow-slate-200/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{selectedStock.market === 'KR' ? '한국 주식' : '미국 주식'}</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-900">{selectedStock.symbol}</h2>
                <p className="mt-2 text-slate-600">{selectedStock.name}</p>
              </div>
              {stockInfo?.current_price && (
                <div className="rounded-3xl bg-slate-50 p-4 text-right">
                  <p className="text-sm text-slate-500">현재 가격</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(stockInfo.current_price, currency)}</p>
                  <p className="mt-1 text-sm text-slate-500">{getSecondaryPriceText(stockInfo.current_price)}</p>
                  {currency === 'USD' && usdKrwRate && (
                    <p className="mt-1 text-xs text-slate-400">적용 환율: 1달러 = {formatCurrency(usdKrwRate, 'KRW')}</p>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="mt-8 rounded-3xl bg-slate-50 p-8 text-center text-slate-500">정보를 불러오는 중입니다...</div>
            ) : error ? (
              <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center text-red-700">{error}</div>
            ) : stockInfo ? (
              <div className="mt-8 space-y-4">
                {fxError && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{fxError}</div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-sm text-slate-500">이전 종가</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(stockInfo.previous_close, currency)}</p>
                    <p className="mt-1 text-sm text-slate-500">{getSecondaryPriceText(stockInfo.previous_close)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-sm text-slate-500">52주 최고</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(stockInfo.high_52week, currency)}</p>
                    <p className="mt-1 text-sm text-slate-500">{getSecondaryPriceText(stockInfo.high_52week)}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-sm text-slate-500">52주 최저</p>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{formatCurrency(stockInfo.low_52week, currency)}</p>
                    <p className="mt-1 text-sm text-slate-500">{getSecondaryPriceText(stockInfo.low_52week)}</p>
                  </div>
                  {stockInfo.pe_ratio && (
                    <div className="rounded-3xl bg-slate-50 p-6">
                      <p className="text-sm text-slate-500">PER</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-900">{stockInfo.pe_ratio?.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-3xl bg-slate-50 p-8 text-center text-slate-500">선택한 종목의 상세 정보가 없습니다.</div>
            )}
          </div>

          <div className="rounded-[2rem] bg-white p-8 shadow-lg shadow-slate-200/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">주가 차트</h3>
                <p className="mt-2 text-sm text-slate-500">최근 1년간 종가 변화</p>
              </div>
              <TrendingUp className="text-sky-500" />
            </div>
            <div className="mt-6 min-h-[360px] rounded-3xl bg-slate-50 p-4">
              <StockChart symbol={selectedStock.symbol} market={selectedStock.market || 'US'} period="1y" />
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-lg shadow-slate-200/30">
          <p className="text-xl font-semibold text-slate-900">종목을 선택하면 차트와 상세 정보를 표시합니다.</p>
          <p className="mt-3 text-slate-500">검색 결과에서 종목을 선택해 보세요.</p>
        </section>
      )}
    </div>
  );
}
