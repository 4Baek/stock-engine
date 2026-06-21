import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import StockDetails from './pages/StockDetails';
import BollingerRecommendations from './pages/BollingerRecommendations';
import BollingerGuide from './pages/BollingerGuide';
import './index.css';

function App() {
  const [userId] = useState('user-demo');

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navigation />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <header className="mb-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-sky-600 font-semibold">Stock Engine</p>
                <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  주식 매매를 더 쉽고 빠르게
                </h1>
                <p className="mt-3 max-w-2xl text-slate-600 text-lg">
                  한국과 미국 주식을 검색하고 차트로 확인하며 포트폴리오를 관리할 수 있는 대시보드입니다.
                </p>
              </div>
              <div className="rounded-[2rem] bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 p-6 text-white shadow-xl shadow-sky-500/20">
                <p className="text-xs uppercase tracking-[0.35em] opacity-80">Market Pulse</p>
                <p className="mt-3 text-2xl font-bold leading-tight">실시간 검색과 추천 분석</p>
                <p className="mt-2 text-sm opacity-90">한국/미국 종목 조회, 차트 분석, 볼리저 추천을 한 번에 확인하세요.</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white/20 px-3 py-1">KR/US Search</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">Bollinger Signals</span>
                  <span className="rounded-full bg-white/20 px-3 py-1">Live Chart</span>
                </div>
              </div>
            </div>
          </header>

          <Routes>
            <Route path="/" element={<Navigate to="/stocks" replace />} />
            <Route path="/dashboard" element={<Dashboard userId={userId} />} />
            <Route path="/stocks" element={<StockDetails />} />
            <Route path="/bollinger-recommendations" element={<BollingerRecommendations />} />
            <Route path="/bollinger-guide" element={<BollingerGuide />} />
            <Route path="/portfolio" element={<Dashboard userId={userId} />} />
            <Route path="*" element={<Navigate to="/stocks" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
