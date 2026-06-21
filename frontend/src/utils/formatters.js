/**
 * 주식 데이터 유틸리티 함수
 */

export const getCurrencyByMarket = (market = 'US') => {
  return market === 'KR' ? 'KRW' : 'USD';
};

export const formatCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  const numericValue = Number(value);
  const locale = currency === 'KRW' ? 'ko-KR' : 'en-US';
  const minimumFractionDigits = currency === 'KRW' ? 0 : 2;
  const maximumFractionDigits = currency === 'KRW' ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue);
};

export const formatLargeCurrencyText = (value, currency = 'USD') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  const numericValue = Math.floor(Math.abs(Number(value)));
  const sign = Number(value) < 0 ? '-' : '';
  const unitLabel = currency === 'KRW' ? '원' : '달러';

  if (numericValue === 0) {
    return `0${unitLabel}`;
  }

  const units = [
    { label: '억', value: 100000000 },
    { label: '만', value: 10000 },
    { label: '천', value: 1000 },
  ];

  let remainder = numericValue;
  const parts = [];

  for (const unit of units) {
    const count = Math.floor(remainder / unit.value);
    if (count > 0) {
      parts.push(`${count}${unit.label}`);
      remainder -= count * unit.value;
    }
  }

  if (remainder > 0 && parts.length === 0) {
    parts.push(remainder.toLocaleString('ko-KR'));
  }

  return `${sign}${parts.join(' ')}${unitLabel}`;
};

export const formatPercent = (value) => {
  const color = value >= 0 ? 'text-green-600' : 'text-red-600';
  const sign = value >= 0 ? '+' : '';
  return `<span class="${color}">${sign}${value?.toFixed(2)}%</span>`;
};

export const calculateGainLoss = (currentValue, investedValue) => {
  if (!investedValue || investedValue === 0) return 0;
  return ((currentValue - investedValue) / investedValue) * 100;
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ko-KR');
};

export const getMarketLabel = (market) => {
  return market === 'KR' ? '한국' : '미국';
};
