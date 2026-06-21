import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { stockService } from '../services/api';

export default function StockSearch({ onSelectStock }) {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState('US');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      let response;
      if (market === 'KR') {
        response = await stockService.searchKrStocks(query);
      } else {
        response = await stockService.searchUsStocks(query);
      }
      setResults(response.data.results || []);
    } catch (error) {
      console.error('검색 오류:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 flex gap-2">
          <select 
            value={market} 
            onChange={(e) => {
              setMarket(e.target.value);
              setResults([]);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="KR">한국</option>
            <option value="US">미국</option>
          </select>
          
          <input
            type="text"
            placeholder={market === 'KR' ? '한국 주식 검색... (예: 삼성전자, SK하이닉스)' : '미국 주식 검색... (예: AAPL, NVDA)'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />
          
          <button 
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Search size={20} />
            검색
          </button>
        </div>
      </form>

      {results.length > 0 ? (
        <div className="mt-4 border border-gray-300 rounded-md overflow-hidden">
          {results.map((stock, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectStock(stock);
                setResults([]);
                setQuery('');
              }}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0"
            >
              <div className="font-semibold">{stock.symbol}</div>
              <div className="text-sm text-gray-600">{stock.name}</div>
            </button>
          ))}
        </div>
      ) : query.trim() && !loading ? (
        <div className="mt-4 rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">검색 결과가 없습니다.</div>
      ) : null}
    </div>
  );
}
