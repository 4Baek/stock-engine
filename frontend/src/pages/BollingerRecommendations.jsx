import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockService } from '../services/api';
import { formatCurrency, formatLargeCurrencyText } from '../utils';
import { BarChart3, RefreshCw, Sparkles } from 'lucide-react';

const marketOptions = [
  { value: 'US', label: '미국 추천' },
  { value: 'KR', label: '한국 추천' },
];

function SignalBadge({ active, label, colorClass }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        active ? colorClass : 'bg-slate-100 text-slate-500'
      }`}
    >
      {label}
    </span>
  );
}

export default function BollingerRecommendations() {
  const navigate = useNavigate();
  const [market, setMarket] = useState('US');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({
    universe_mode: 'top_value',
    top_value_count: 200,
    limit: 8,
    min_score: 30,
    atr_multiplier: 1.6,
    breakout_weight: 35,
    squeeze_weight: 20,
    trend_weight: 15,
    volume_weight: 15,
    above_middle_weight: 10,
    breakout_down_penalty: 20,
    volume_threshold: 1.3,
  });

  const loadingStageText = useMemo(() => {
    if (loadingProgress < 34) return '종목 수집 중';
    if (loadingProgress < 84) return '볼리저 지표 계산 중';
    return '점수 정렬 및 추천 생성 중';
  }, [loadingProgress]);

  const universeOptions = useMemo(() => {
    if (market === 'US') {
      return [{ value: 'top_value', label: '유동성 상위' }];
    }
    return [
      { value: 'top_value', label: '거래대금 상위' },
      { value: 'all', label: '전체 (코스피/코스닥)' },
    ];
  }, [market]);

  const universeCountLabel = market === 'US' ? '유동성 상위 개수' : '거래대금 상위 개수';

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0);
      return undefined;
    }

    const isAllMode = market === 'KR' && settings.universe_mode === 'all';
    const maxBeforeDone = 92;
    const step = isAllMode ? 1 : 3;
    const intervalMs = isAllMode ? 350 : 180;

    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= maxBeforeDone) return prev;
        return Math.min(maxBeforeDone, prev + step);
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [loading, market, settings.universe_mode]);

  const fetchRecommendations = async (nextMarket, nextSettings = settings) => {
    setLoading(true);
    setLoadingProgress(5);
    setError(null);

    try {
      const response = await stockService.getBollingerRecommendations(nextMarket, nextSettings.limit, nextSettings);
      setMeta({
        market: response.data.market,
        generatedAt: response.data.generated_at,
        analyzedCount: response.data.analyzed_count,
        selectedCount: response.data.selected_count,
        candidateCount: response.data.candidate_count,
        strategy: response.data.strategy,
        config: response.data.config,
        notice: response.data.notice,
        fallbackMode: response.data.fallback_mode,
      });
      setItems(response.data.recommendations || []);
      setLoadingProgress(100);
    } catch (err) {
      console.error('볼리저 추천 조회 오류:', err);
      setItems([]);
      setMeta(null);
      setError(err?.response?.data?.error || err.message || '추천 데이터를 불러오지 못했습니다.');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 120);
    }
  };

  useEffect(() => {
    fetchRecommendations(market);
  }, [market]);

  useEffect(() => {
    if (market === 'US' && settings.universe_mode !== 'top_value') {
      setSettings((prev) => ({ ...prev, universe_mode: 'top_value' }));
    }
  }, [market, settings.universe_mode]);

  const openStockDetails = (item) => {
    const params = new URLSearchParams({
      symbol: item.symbol,
      market: item.market,
      name: item.name,
    });
    navigate(`/stocks?${params.toString()}`);
  };

  const marketLabel = useMemo(() => (market === 'KR' ? '한국' : '미국'), [market]);

  const getRiskRewardRatio = (item) => {
    const apiRr = Number(item?.trade_plan?.rr_ratio);
    if (Number.isFinite(apiRr) && apiRr > 0) return apiRr;

    const current = Number(item?.current_price);
    const stop = Number(item?.trade_plan?.stop_loss_price);
    const take = Number(item?.trade_plan?.take_profit_price);

    if (![current, stop, take].every(Number.isFinite)) return null;

    const risk = current - stop;
    const reward = take - current;
    if (risk <= 0 || reward <= 0) return null;

    return reward / risk;
  };

  const getPriceGraphData = (item) => {
    const stop = Number(item?.trade_plan?.stop_loss_price);
    const current = Number(item?.current_price);
    const take = Number(item?.trade_plan?.take_profit_price);
    const lower = Number(item?.lower_band);
    const middle = Number(item?.middle_band);
    const upper = Number(item?.upper_band);

    const all = [stop, current, take, lower, middle, upper].filter(Number.isFinite);
    if (all.length < 4) return null;

    const rangeMin = Math.min(...all);
    const rangeMax = Math.max(...all);
    const span = Math.max(rangeMax - rangeMin, 1e-9);
    const pct = (v) => Math.max(0, Math.min(100, ((v - rangeMin) / span) * 100));

    return {
      stop,
      current,
      take,
      lower,
      middle,
      upper,
      pos: {
        stop: pct(stop),
        current: pct(current),
        take: pct(take),
        lower: pct(lower),
        middle: pct(middle),
        upper: pct(upper),
      },
    };
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Bollinger Recommendation</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">볼리저밴드 추천 종목</h1>
            <p className="mt-2 text-slate-500">한국/미국 시장별로 스퀴즈, 돌파, 추세, 거래량을 점수화해 추천합니다.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-3xl bg-slate-100 p-1">
              {marketOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMarket(option.value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    market === option.value ? 'bg-sky-600 text-white shadow' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchRecommendations(market)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw size={16} />
              새로고침
            </button>
          </div>
        </div>

        {meta && (
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              분석 시장: <span className="font-semibold text-slate-900">{marketLabel}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              분석 종목 수: <span className="font-semibold text-slate-900">{meta.analyzedCount}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              전략: <span className="font-semibold text-slate-900">{meta.strategy}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              유니버스: <span className="font-semibold text-slate-900">{meta.config?.universe_mode === 'all' ? '전체' : market === 'US' ? '유동성 상위' : '거래대금 상위'}</span>
            </div>
          </div>
        )}

        {meta?.notice && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {meta.notice}
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-800">추천 기준 조절</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm text-slate-600">
              분석 대상
              <select
                value={settings.universe_mode}
                onChange={(e) => setSettings((prev) => ({ ...prev, universe_mode: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              >
                {universeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              {universeCountLabel}
              <input
                type="number"
                min="50"
                max="500"
                step="10"
                value={settings.top_value_count}
                disabled={settings.universe_mode !== 'top_value'}
                onChange={(e) => setSettings((prev) => ({ ...prev, top_value_count: Number(e.target.value) || 200 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
              />
            </label>
            <label className="text-sm text-slate-600">
              추천 개수
              <input
                type="number"
                min="1"
                max="20"
                value={settings.limit}
                onChange={(e) => setSettings((prev) => ({ ...prev, limit: Number(e.target.value) || 1 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              최소 점수
              <input
                type="number"
                min="0"
                max="100"
                value={settings.min_score}
                onChange={(e) => setSettings((prev) => ({ ...prev, min_score: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              ATR 배수
              <input
                type="number"
                min="0.5"
                max="3"
                step="0.1"
                value={settings.atr_multiplier}
                onChange={(e) => setSettings((prev) => ({ ...prev, atr_multiplier: Number(e.target.value) || 1.6 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              손익비 계산
              <div className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-slate-600">
                그래프 신호 기반 자동 계산
              </div>
            </label>
          </div>
          {market === 'KR' && settings.universe_mode === 'all' && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              전체 모드는 코스피/코스닥 전 종목을 평가하므로 시간이 오래 걸릴 수 있습니다.
            </div>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-600">
              상단 돌파 가중치
              <input
                type="number"
                min="0"
                max="60"
                value={settings.breakout_weight}
                onChange={(e) => setSettings((prev) => ({ ...prev, breakout_weight: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              스퀴즈 가중치
              <input
                type="number"
                min="0"
                max="60"
                value={settings.squeeze_weight}
                onChange={(e) => setSettings((prev) => ({ ...prev, squeeze_weight: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              추세 가중치
              <input
                type="number"
                min="0"
                max="60"
                value={settings.trend_weight}
                onChange={(e) => setSettings((prev) => ({ ...prev, trend_weight: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              거래량 가중치
              <input
                type="number"
                min="0"
                max="60"
                value={settings.volume_weight}
                onChange={(e) => setSettings((prev) => ({ ...prev, volume_weight: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              중심선 상단 가중치
              <input
                type="number"
                min="0"
                max="60"
                value={settings.above_middle_weight}
                onChange={(e) => setSettings((prev) => ({ ...prev, above_middle_weight: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              거래량 기준(배)
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={settings.volume_threshold}
                onChange={(e) => setSettings((prev) => ({ ...prev, volume_threshold: Number(e.target.value) || 1 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              하단 이탈 패널티
              <input
                type="number"
                min="0"
                max="60"
                value={settings.breakout_down_penalty}
                onChange={(e) => setSettings((prev) => ({ ...prev, breakout_down_penalty: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-4">
            <button
              onClick={() => fetchRecommendations(market, settings)}
              className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              설정 적용
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[2rem] bg-white p-10 text-center text-slate-500 shadow-lg shadow-slate-200/30">
          <p className="text-base font-semibold text-slate-700">{loadingStageText}</p>
          <p className="mt-2 text-sm text-slate-500">
            {loadingProgress}% {market === 'KR' && settings.universe_mode === 'all' ? '(전체 모드는 시간이 오래 걸릴 수 있습니다)' : ''}
          </p>
          <div className="mx-auto mt-4 h-3 w-full max-w-xl overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-200"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[2rem] bg-red-50 p-10 text-center text-red-700 shadow-lg shadow-red-100/40">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-10 text-center text-slate-500 shadow-lg shadow-slate-200/30">추천할 데이터가 없습니다. 잠시 후 다시 시도해 주세요.</div>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          {items.map((item) => {
            const riskRewardRatio = getRiskRewardRatio(item);
            const priceGraph = getPriceGraphData(item);
            return (
            <article key={`${item.market}-${item.symbol}`} className="rounded-[1.75rem] bg-white p-6 shadow-lg shadow-slate-200/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{item.market === 'KR' ? 'KOREA' : 'USA'}</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">{item.symbol}</h2>
                  <p className="mt-1 text-slate-600">{item.name}</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-white">
                  <p className="text-xs opacity-80">추천 점수</p>
                  <p className="text-2xl font-bold">{Number(item.score || 0).toFixed(1)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">현재 가격</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(item.current_price, item.currency)}</p>
                  <p className="mt-1 text-xs text-slate-500">약 {formatLargeCurrencyText(item.current_price, item.currency)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">밴드 폭 / 거래량</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{item.bandwidth}%</p>
                  <p className="mt-1 text-xs text-slate-500">거래량 {item.volume_ratio}배</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <SignalBadge active={item.signals?.breakout_up} label="상단 돌파" colorClass="bg-emerald-100 text-emerald-700" />
                <SignalBadge active={item.signals?.squeeze} label="스퀴즈" colorClass="bg-amber-100 text-amber-700" />
                <SignalBadge active={item.signals?.trend_up} label="상승 추세" colorClass="bg-sky-100 text-sky-700" />
                <SignalBadge active={item.signals?.breakout_down} label="하단 이탈" colorClass="bg-rose-100 text-rose-700" />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <BarChart3 size={16} />
                  <p className="text-sm font-semibold">밴드 분석</p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  밴드는 가격 범위를 나타냅니다. 중심선은 20일 평균, 상단선은 상대적 고평가 구간, 하단선은 상대적 저평가 구간으로 해석합니다.
                </p>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  <p>중심선: {formatCurrency(item.middle_band, item.currency)}</p>
                  <p>상단선: {formatCurrency(item.upper_band, item.currency)}</p>
                  <p>하단선: {formatCurrency(item.lower_band, item.currency)}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-center gap-2 text-sky-700">
                  <Sparkles size={16} />
                  <p className="text-sm font-semibold">분석 요약</p>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {(item.analysis || []).map((line, index) => (
                    <li key={`${item.symbol}-analysis-${index}`}>• {line}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  추천 손절가: <span className="font-semibold text-slate-900">{formatCurrency(item.trade_plan?.stop_loss_price, item.currency)}</span>
                  <p className="mt-1 text-xs text-slate-500">기준: 현재가 대비 -{item.trade_plan?.stop_loss_pct}% (적응형)</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  추천 익절가: <span className="font-semibold text-slate-900">{formatCurrency(item.trade_plan?.take_profit_price, item.currency)}</span>
                  <p className="mt-1 text-xs text-slate-500">기준: 현재가 대비 +{item.trade_plan?.take_profit_pct}% (적응형)</p>
                  {item.trade_plan?.take_profit_capped && Number.isFinite(Number(item.trade_plan?.take_profit_cap_pct)) && (
                    <p className="mt-1 text-xs text-amber-700">익절 상한 적용됨: 최대 +{item.trade_plan?.take_profit_cap_pct}%</p>
                  )}
                </div>
              </div>

              {priceGraph && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">가격 위치 그래프</p>
                  <p className="mt-1 text-xs text-slate-500">밴드(하단/중심/상단)와 추천 손절·현재·추천 익절 위치를 한 축에서 비교합니다.</p>
                  <div className="relative mt-3 h-12 rounded-xl bg-white border border-slate-200">
                    <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />

                    <div className="absolute top-2 h-8 w-[1px] bg-rose-300" style={{ left: `${priceGraph.pos.stop}%` }} />
                    <div className="absolute top-2 h-8 w-[1px] bg-sky-300" style={{ left: `${priceGraph.pos.current}%` }} />
                    <div className="absolute top-2 h-8 w-[1px] bg-emerald-300" style={{ left: `${priceGraph.pos.take}%` }} />

                    <div className="absolute bottom-1 h-2 w-2 -translate-x-1/2 rounded-full bg-rose-500" style={{ left: `${priceGraph.pos.stop}%` }} title="추천 손절가" />
                    <div className="absolute bottom-1 h-2 w-2 -translate-x-1/2 rounded-full bg-sky-600" style={{ left: `${priceGraph.pos.current}%` }} title="현재가" />
                    <div className="absolute bottom-1 h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-600" style={{ left: `${priceGraph.pos.take}%` }} title="추천 익절가" />

                    <div className="absolute top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-slate-400" style={{ left: `${priceGraph.pos.lower}%` }} title="하단선" />
                    <div className="absolute top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-slate-500" style={{ left: `${priceGraph.pos.middle}%` }} title="중심선" />
                    <div className="absolute top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-slate-700" style={{ left: `${priceGraph.pos.upper}%` }} title="상단선" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>● 손절(빨강)</span>
                    <span>● 현재(파랑)</span>
                    <span>● 익절(초록)</span>
                    <span>● 밴드선(회색)</span>
                  </div>
                </div>
              )}

              {riskRewardRatio && (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  추천 손익비: <span className="font-semibold">{riskRewardRatio.toFixed(2)} : 1</span>
                  <p className="mt-1 text-xs text-emerald-700">
                    계산식: (추천 익절가 - 현재가) / (현재가 - 추천 손절가)
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    그래프 신호 기반 적용 손익비 {Number(item.trade_plan?.target_rr || 0).toFixed(2)}:1
                  </p>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => openStockDetails(item)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  종목 상세 보기
                </button>
              </div>
            </article>
          );})}
        </section>
      )}
    </div>
  );
}
