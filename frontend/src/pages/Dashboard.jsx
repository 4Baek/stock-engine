import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/api';
import { TrendingUp, Wallet } from 'lucide-react';

function CreatePortfolioBox({ userId, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('My Portfolio');
  const [initialBalance, setInitialBalance] = useState(1000000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await portfolioService.createPortfolio(userId, name, Number(initialBalance));
      const statsRes = await portfolioService.getPortfolioStats(userId);
      onCreated(res.data, statsRes.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || '생성 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6">
      {!open ? (
        <button
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-white font-semibold shadow-md hover:bg-sky-700"
          onClick={() => setOpen(true)}
        >
          <Wallet className="h-4 w-4" /> 포트폴리오 생성
        </button>
      ) : (
        <div className="mx-auto max-w-md text-left">
          <label className="block text-sm text-slate-600">이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
          <label className="block mt-3 text-sm text-slate-600">초기 잔액 (USD)</label>
          <input type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex items-center gap-2">
            <button disabled={submitting} onClick={handleCreate} className="rounded-full bg-sky-600 px-4 py-2 text-white font-medium hover:bg-sky-700 disabled:opacity-50">
              {submitting ? '생성 중...' : '생성하기'}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 border">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ userId }) {
  const [portfolio, setPortfolio] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const portfolioRes = await portfolioService.getPortfolio(userId);
        const statsRes = await portfolioService.getPortfolioStats(userId);

        setPortfolio(portfolioRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('데이터 로딩 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  if (loading) return <div className="text-center py-16 text-slate-500">로딩 중...</div>;

  if (!portfolio) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm shadow-slate-200/50">
        <p className="text-xl font-semibold text-slate-900">아직 포트폴리오가 없습니다.</p>
        <p className="mt-3 text-slate-500">포트폴리오를 생성하면 자산 현황과 보유 종목을 확인할 수 있습니다.</p>

        <CreatePortfolioBox userId={userId} onCreated={(p, s) => { setPortfolio(p); setStats(s); }} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-[2rem] bg-white p-8 shadow-lg shadow-slate-200/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">포트폴리오</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">{portfolio.name}</h2>
            </div>
            <div className="rounded-3xl bg-slate-100 px-4 py-3 text-slate-700">사용자: {portfolio.user_id}</div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">보유 잔액</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">${stats?.balance?.toFixed(2)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">현재 자산</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">${stats?.current_value?.toFixed(2)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">총 투자액</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">${stats?.total_invested?.toFixed(2)}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-gradient-to-r from-sky-500 to-cyan-500 p-8 text-white shadow-xl shadow-sky-300/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] opacity-80">손익 분석</p>
              <h3 className="mt-3 text-3xl font-bold">${stats?.gain_loss?.toFixed(2)}</h3>
            </div>
            <div className="rounded-full bg-white/15 px-4 py-3 text-sm font-semibold">
              {stats?.gain_loss_percent?.toFixed(2)}%
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sky-100">현재 포트폴리오 성과를 빠르게 확인하세요. 시장 흐름에 따라 매매 전략을 업데이트할 수 있습니다.</p>
        </section>
      </div>

      <section className="rounded-[2rem] bg-white p-6 shadow-lg shadow-slate-200/40">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">보유 종목 ({portfolio.holdings?.length || 0})</h2>
          <TrendingUp className="text-sky-500" />
        </div>
        {portfolio.holdings && portfolio.holdings.length > 0 ? (
          <div className="mt-6 space-y-3">
            {portfolio.holdings.map((holding) => (
              <div key={holding.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{holding.stock.symbol}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{holding.stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">총량</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{holding.quantity}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
            <p className="text-base font-medium">보유 종목이 아직 없습니다.</p>
            <p className="mt-3 text-sm">종목을 검색해 매수하면 이곳에 보유 목록이 표시됩니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
