import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const navItems = [
  { label: '주식 검색', to: '/stocks' },
  { label: '볼리저밴드추천', to: '/bollinger-recommendations' },
  { label: '볼리저 설명', to: '/bollinger-guide' },
  { label: '대시보드', to: '/dashboard', disabled: true },
  { label: '포트폴리오', to: '/portfolio', disabled: true },
  { label: '거래', to: '/trade', disabled: true },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinkClass = ({ isActive }) =>
    isActive
      ? 'rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition'
      : 'rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100';

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
              <span className="text-lg">📈</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Stock Engine</p>
              <p className="text-xs text-slate-500">Market Dashboard</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {navItems.map((item) => (
              item.disabled ? (
                <span
                  key={item.to}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
                  title="현재 사용하지 않는 메뉴"
                >
                  {item.label}
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500">사용 안함</span>
                </span>
              ) : (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              )
            ))}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden space-y-2 pb-4">
            {navItems.map((item) => (
              item.disabled ? (
                <div
                  key={item.to}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-400"
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500">사용 안함</span>
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'block rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition'
                      : 'block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100'
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </NavLink>
              )
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
