import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { stockService } from '../services/api';

export default function StockChart({ symbol, market = 'US', period = '1y' }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await stockService.getStockHistory(symbol, market, period);
        const prices = response.data.prices || [];

        const formattedData = prices.map(price => ({
          date: new Date(price.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
          close: price.close,
          open: price.open,
          high: price.high,
          low: price.low,
        }));

        setChartData(formattedData);
        setError(null);
      } catch (err) {
        setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchData();
    }
  }, [symbol, market, period]);

  if (!symbol) return <div className="text-center py-12 text-slate-500">종목을 선택하면 차트를 표시합니다.</div>;
  if (loading) return <div className="text-center py-12 text-slate-500">데이터 로딩 중...</div>;
  if (error) return <div className="text-center py-12 text-red-500">오류: {error}</div>;

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
        <XAxis tickLine={false} axisLine={false} dataKey="date" tick={{ fill: '#475569', fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} />
        <Tooltip contentStyle={{ borderRadius: 16, borderColor: '#e2e8f0' }} />
        <Legend verticalAlign="top" />
        <Line type="monotone" dataKey="close" stroke="#0ea5e9" strokeWidth={3} dot={false} name="종가" />
      </LineChart>
    </ResponsiveContainer>
  );
}
