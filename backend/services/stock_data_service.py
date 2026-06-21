"""
Stock data service - fetches stock data from various sources
"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging
import requests
import copy
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import re

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    import FinanceDataReader as fdr
except ImportError:
    fdr = None

logger = logging.getLogger(__name__)

class StockDataService:
    """Service to fetch stock data from Korea and US markets"""

    _krx_cache = []
    _krx_cache_expire_at = None
    _bollinger_cache = {}
    _bollinger_cache_ttl_seconds = 120
    _cache_lock = threading.Lock()

    @staticmethod
    def _period_to_yahoo_range(period='1y'):
        mapping = {
            '5d': '5d',
            '1mo': '1mo',
            '3mo': '3mo',
            '6mo': '6mo',
            '1y': '1y',
            '2y': '2y',
            '5y': '5y',
        }
        return mapping.get(period, '1y')

    @staticmethod
    def _fetch_us_chart(symbol, period='1y', interval='1d'):
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {
            'range': StockDataService._period_to_yahoo_range(period),
            'interval': interval,
            'includePrePost': 'false',
            'events': 'div,splits',
        }
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        payload = response.json()
        result = (payload.get('chart') or {}).get('result') or []
        if not result:
            return pd.DataFrame()

        item = result[0]
        timestamps = item.get('timestamp') or []
        quote_arr = (item.get('indicators') or {}).get('quote') or []
        if not timestamps or not quote_arr:
            return pd.DataFrame()

        quote = quote_arr[0]
        frame = pd.DataFrame({
            'Open': quote.get('open', []),
            'High': quote.get('high', []),
            'Low': quote.get('low', []),
            'Close': quote.get('close', []),
            'Volume': quote.get('volume', []),
        }, index=pd.to_datetime(timestamps, unit='s', utc=True).tz_convert(None))

        frame = frame.dropna(subset=['Close'])
        return frame

    @staticmethod
    def _search_us_stocks(query, limit=20):
        url = 'https://query2.finance.yahoo.com/v1/finance/search'
        params = {
            'q': query,
            'quotesCount': max(10, min(50, int(limit))),
            'newsCount': 0,
        }
        headers = {'User-Agent': 'Mozilla/5.0'}

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        payload = response.json()
        quotes = payload.get('quotes', [])

        results = []
        for quote in quotes:
            symbol = quote.get('symbol')
            quote_type = quote.get('quoteType') or quote.get('typeDisp')
            exchange = quote.get('exchange') or ''
            if not symbol:
                continue
            if quote_type and str(quote_type).upper() not in ['EQUITY', 'ETF', 'MUTUALFUND']:
                continue
            if exchange and str(exchange).upper() in ['KOE', 'KSC']:
                continue

            results.append({
                'symbol': symbol,
                'name': quote.get('longname') or quote.get('shortname') or symbol,
                'market': 'US',
                'currency': 'USD'
            })

        deduped = []
        seen = set()
        for row in results:
            key = row['symbol']
            if key in seen:
                continue
            seen.add(key)
            deduped.append(row)

        return deduped[:limit]

    @staticmethod
    def _period_to_start_date(period='1y'):
        days_map = {
            '5d': 10,
            '1mo': 40,
            '3mo': 120,
            '6mo': 240,
            '1y': 400,
            '2y': 800,
            '5y': 2000,
        }
        days = days_map.get(period, 400)
        return (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')

    @staticmethod
    def _fetch_kr_history(symbol, period='1y'):
        start_date = StockDataService._period_to_start_date(period)

        # Preferred source for KR stocks.
        if fdr is not None:
            try:
                hist = fdr.DataReader(symbol, start_date)
                if hist is not None and not hist.empty:
                    return hist
            except Exception as kr_err:
                logger.warning(f"FDR history fetch failed for {symbol}: {kr_err}")

        # Fallback to Yahoo ticker suffix attempts.
        for suffix in ['.KS', '.KQ']:
            try:
                ticker = yf.Ticker(f"{symbol}{suffix}")
                hist = StockDataService._fetch_history(ticker, period)
                if hist is not None and not hist.empty:
                    return hist
            except Exception:
                continue

        return pd.DataFrame()

    @staticmethod
    def _calculate_bollinger_metrics(hist_df, window=20, config=None):
        """Calculate Bollinger band metrics from historical OHLCV data."""
        if hist_df is None or hist_df.empty or len(hist_df) < window + 1:
            return None

        config = config or {}
        breakout_weight = int(config.get('breakout_weight', 35))
        squeeze_weight = int(config.get('squeeze_weight', 20))
        trend_weight = int(config.get('trend_weight', 15))
        volume_weight = int(config.get('volume_weight', 15))
        above_middle_weight = int(config.get('above_middle_weight', 10))
        downside_penalty = int(config.get('breakout_down_penalty', 20))
        volume_threshold = float(config.get('volume_threshold', 1.3))
        stop_loss_pct = float(config.get('stop_loss_pct', 5.0))
        take_profit_pct = float(config.get('take_profit_pct', 12.0))

        close = hist_df['Close'].astype(float)
        middle = close.rolling(window=window).mean()
        std = close.rolling(window=window).std()
        upper = middle + (2 * std)
        lower = middle - (2 * std)

        volume = (
            hist_df['Volume'].astype(float)
            if 'Volume' in hist_df.columns
            else pd.Series([0.0] * len(hist_df), index=close.index)
        )
        ma60 = close.rolling(window=60).mean()

        data = pd.DataFrame({
            'close': close,
            'middle': middle,
            'upper': upper,
            'lower': lower,
            'volume': volume,
            'ma60': ma60,
        }).dropna()

        if data.empty or len(data) < 2:
            return None

        current = data.iloc[-1]
        previous = data.iloc[-2]
        bandwidth_series = ((data['upper'] - data['lower']) / data['middle']) * 100
        recent_bandwidth = bandwidth_series.tail(60)

        if recent_bandwidth.empty:
            return None

        squeeze_threshold = float(recent_bandwidth.quantile(0.2))
        current_bandwidth = float(recent_bandwidth.iloc[-1])
        avg_volume_20 = float(data['volume'].tail(20).mean()) if len(data) >= 20 else float(data['volume'].mean())
        current_volume = float(current['volume'])
        volume_ratio = (current_volume / avg_volume_20) if avg_volume_20 > 0 else 1.0

        breakout_up = bool(current['close'] > current['upper'] and previous['close'] <= previous['upper'])
        breakout_down = bool(current['close'] < current['lower'] and previous['close'] >= previous['lower'])
        squeeze = bool(current_bandwidth <= squeeze_threshold)
        trend_up = bool(pd.notna(current['ma60']) and current['close'] > current['ma60'])
        above_middle = bool(current['close'] > current['middle'])

        score = 0
        if breakout_up:
            score += breakout_weight
        if squeeze:
            score += squeeze_weight
        if trend_up:
            score += trend_weight
        if volume_ratio >= volume_threshold:
            score += volume_weight
        if above_middle:
            score += above_middle_weight
        if breakout_down:
            score -= downside_penalty

        score = max(0, min(100, score))

        rationale = []
        if breakout_up:
            rationale.append('상단 밴드 돌파로 단기 모멘텀이 강화되었습니다.')
        if squeeze:
            rationale.append('최근 밴드 폭이 축소된 스퀴즈 구간입니다.')
        if trend_up:
            rationale.append('종가가 60일 이동평균 위에서 유지되고 있습니다.')
        if volume_ratio >= volume_threshold:
            rationale.append(f'거래량이 평균 대비 {volume_ratio:.2f}배로 증가했습니다.')
        if breakout_down:
            rationale.append('하단 밴드 이탈로 변동성 리스크가 존재합니다.')
        if not rationale:
            rationale.append('볼리저밴드 기준 중립 구간으로 추가 확인이 필요합니다.')

        stop_loss_price = float(current['close'] * (1 - stop_loss_pct / 100))
        take_profit_price = float(current['close'] * (1 + take_profit_pct / 100))

        return {
            'current_price': float(current['close']),
            'middle_band': float(current['middle']),
            'upper_band': float(current['upper']),
            'lower_band': float(current['lower']),
            'bandwidth': round(current_bandwidth, 2),
            'squeeze_threshold': round(squeeze_threshold, 2),
            'volume_ratio': round(volume_ratio, 2),
            'signals': {
                'breakout_up': breakout_up,
                'breakout_down': breakout_down,
                'squeeze': squeeze,
                'trend_up': trend_up,
                'above_middle': above_middle,
            },
            'score': score,
            'trade_plan': {
                'stop_loss_pct': round(stop_loss_pct, 2),
                'take_profit_pct': round(take_profit_pct, 2),
                'stop_loss_price': stop_loss_price,
                'take_profit_price': take_profit_price,
            },
            'analysis': rationale,
        }

    @staticmethod
    def get_bollinger_recommendations(market='KR', limit=6, config=None):
        """Get Bollinger-band based stock recommendations by market."""
        try:
            config = config or {}
            market = (market or 'KR').upper()
            if market not in ['KR', 'US']:
                return {'error': 'Invalid market', 'error_type': 'bad_request'}

            universe_mode = str(config.get('universe_mode', 'top_value')).lower()
            top_value_count = int(config.get('top_value_count', 200))
            us_candidate_count = int(config.get('us_candidate_count', top_value_count))
            us_candidate_count = max(20, min(500, us_candidate_count))

            cache_key = f"{market}|{int(limit)}|{json.dumps(config, sort_keys=True, ensure_ascii=False)}"
            now = datetime.utcnow()
            with StockDataService._cache_lock:
                cached = StockDataService._bollinger_cache.get(cache_key)
                if cached and cached.get('expires_at') and now < cached['expires_at']:
                    cached_data = cached.get('data') or {}
                    cached_candidates = int(cached_data.get('candidate_count', 0) or 0)
                    if not (market == 'KR' and universe_mode == 'all' and cached_candidates < 100):
                        return copy.deepcopy(cached_data)

            min_score = int(config.get('min_score', 0))
            requested_min_score = min_score

            if market == 'KR':
                if universe_mode == 'all':
                    candidates = StockDataService.get_krx_stocks(10000)
                else:
                    candidates = StockDataService.get_kr_top_trading_value_stocks(top_value_count)
                    if not candidates:
                        candidates = StockDataService.get_krx_stocks(min(top_value_count, 500))
                        universe_mode = 'top_value_fallback'
            else:
                candidates = StockDataService.get_us_stocks(us_candidate_count)

            recommendations = []
            analyzed_count = 0

            def analyze_candidate(stock):
                symbol = stock.get('symbol')
                try:
                    if market == 'KR':
                        hist = StockDataService._fetch_kr_history(symbol, '6mo')
                    else:
                        hist = StockDataService._fetch_us_chart(symbol, period='6mo', interval='1d')
                        if hist is None or hist.empty:
                            ticker = StockDataService._build_ticker(symbol, market)
                            hist = StockDataService._fetch_history(ticker, '6mo')

                    metrics = StockDataService._calculate_bollinger_metrics(hist, config=config)
                    if not metrics:
                        return None

                    return {
                        'symbol': symbol,
                        'name': stock.get('name', symbol),
                        'market': market,
                        'currency': stock.get('currency', 'KRW' if market == 'KR' else 'USD'),
                        **metrics,
                    }
                except Exception as stock_err:
                    logger.warning(f"Failed Bollinger analysis for {symbol} ({market}): {stock_err}")
                    return None

            max_workers = min(8, max(2, len(candidates))) if candidates else 2
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(analyze_candidate, stock) for stock in candidates]
                for future in as_completed(futures):
                    try:
                        item = future.result()
                    except Exception as future_err:
                        logger.warning(f"Bollinger worker failed ({market}): {future_err}")
                        continue
                    if item:
                        analyzed_count += 1
                        recommendations.append(item)

            recommendations.sort(key=lambda x: x.get('score', 0), reverse=True)

            # Primary filtering by requested threshold.
            filtered_recommendations = [
                item for item in recommendations
                if item.get('score', 0) >= min_score
            ]

            applied_min_score = min_score
            fallback_mode = None
            notice = None

            # Fallback 1: relax min score step-by-step to avoid empty result.
            if not filtered_recommendations and recommendations and min_score > 0:
                for threshold in range(max(0, min_score - 10), -1, -10):
                    candidate_filtered = [
                        item for item in recommendations
                        if item.get('score', 0) >= threshold
                    ]
                    if candidate_filtered:
                        filtered_recommendations = candidate_filtered
                        applied_min_score = threshold
                        fallback_mode = 'min_score_relaxed'
                        notice = f"추천 결과가 없어 최소 점수를 {min_score}점에서 {threshold}점으로 자동 완화했습니다."
                        break

            # Fallback 2: force top-N if still empty.
            if not filtered_recommendations and recommendations:
                filtered_recommendations = recommendations[:max(1, int(limit))]
                applied_min_score = 0
                fallback_mode = 'forced_top_n'
                notice = '추천 조건을 만족하는 종목이 없어 상위 점수 종목을 참고용으로 표시합니다.'

            top_recommendations = filtered_recommendations[:max(1, int(limit))]

            if fallback_mode == 'forced_top_n':
                for item in top_recommendations:
                    item['forced_recommendation'] = True

            data = {
                'market': market,
                'generated_at': datetime.utcnow().isoformat(),
                'strategy': 'Bollinger Band + Volume + Trend Score',
                'analyzed_count': analyzed_count,
                'candidate_count': len(candidates),
                'selected_count': len(top_recommendations),
                'fallback_mode': fallback_mode,
                'notice': notice,
                'config': {
                    'min_score': applied_min_score,
                    'requested_min_score': requested_min_score,
                    'universe_mode': universe_mode,
                    'top_value_count': top_value_count,
                    'us_candidate_count': us_candidate_count,
                    'breakout_weight': int(config.get('breakout_weight', 35)),
                    'squeeze_weight': int(config.get('squeeze_weight', 20)),
                    'trend_weight': int(config.get('trend_weight', 15)),
                    'volume_weight': int(config.get('volume_weight', 15)),
                    'above_middle_weight': int(config.get('above_middle_weight', 10)),
                    'breakout_down_penalty': int(config.get('breakout_down_penalty', 20)),
                    'volume_threshold': float(config.get('volume_threshold', 1.3)),
                    'stop_loss_pct': float(config.get('stop_loss_pct', 5.0)),
                    'take_profit_pct': float(config.get('take_profit_pct', 12.0)),
                },
                'recommendations': top_recommendations,
            }

            should_cache = not (market == 'KR' and universe_mode == 'all' and len(candidates) < 100)
            if should_cache:
                with StockDataService._cache_lock:
                    StockDataService._bollinger_cache[cache_key] = {
                        'expires_at': now + timedelta(seconds=StockDataService._bollinger_cache_ttl_seconds),
                        'data': copy.deepcopy(data)
                    }

            return data
        except Exception as e:
            logger.error(f"Error generating Bollinger recommendations for {market}: {e}")
            return {'error': str(e), 'error_type': 'internal'}

    @staticmethod
    def get_exchange_rate(base='USD', quote='KRW'):
        """Get exchange rate using Yahoo Finance ticker data"""
        try:
            base = (base or 'USD').upper()
            quote = (quote or 'KRW').upper()

            if base == quote:
                return {
                    'base': base,
                    'quote': quote,
                    'rate': 1.0,
                    'last_update': datetime.utcnow().isoformat()
                }

            # Yahoo ticker for USD/KRW is usually KRW=X.
            pair_candidates = [
                f"{quote}=X" if base == 'USD' else None,
                f"{base}{quote}=X",
                f"{base}{quote}",
            ]

            for pair in [p for p in pair_candidates if p]:
                try:
                    ticker = yf.Ticker(pair)
                    hist = StockDataService._fetch_history(ticker, '5d')
                    if hist is not None and len(hist) > 0:
                        rate = float(hist['Close'].iloc[-1])
                        return {
                            'base': base,
                            'quote': quote,
                            'rate': rate,
                            'source': 'yfinance',
                            'last_update': datetime.utcnow().isoformat()
                        }
                except Exception:
                    continue

            # Fallback: open exchange-rate API (no key required).
            try:
                resp = requests.get(f"https://open.er-api.com/v6/latest/{base}", timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    rates = data.get('rates') or {}
                    if quote in rates:
                        return {
                            'base': base,
                            'quote': quote,
                            'rate': float(rates[quote]),
                            'source': 'open.er-api.com',
                            'last_update': datetime.utcnow().isoformat()
                        }
            except Exception as fx_err:
                logger.warning(f"Fallback exchange-rate API failed for {base}/{quote}: {fx_err}")

            return None
        except Exception as e:
            logger.error(f"Error fetching exchange rate {base}/{quote}: {e}")
            return None
    
    @staticmethod
    def get_krx_stocks(limit=100):
        """Get list of KRX (Korea Exchange) stocks"""
        try:
            now = datetime.utcnow()
            if (
                StockDataService._krx_cache
                and len(StockDataService._krx_cache) >= 100
                and StockDataService._krx_cache_expire_at
                and now < StockDataService._krx_cache_expire_at
            ):
                return StockDataService._krx_cache[:limit]

            normalized = []

            # Preferred source: KIND official listed-company table (no API key required).
            kind_url = 'https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13'
            try:
                listing = pd.read_html(kind_url, encoding='cp949')[0]
                for _, row in listing.iterrows():
                    code_raw = str(row.get('종목코드', '')).strip()
                    market_type = str(row.get('시장구분', '')).strip().upper()
                    if not code_raw:
                        continue
                    symbol = code_raw.zfill(6)
                    # Exclude non-standard codes and non-main markets for faster/cleaner analysis/search.
                    if not symbol.isdigit():
                        continue
                    if market_type not in ['KOSPI', 'KOSDAQ', '코스피', '코스닥']:
                        continue
                    name = str(row.get('회사명', '')).strip()
                    if not name:
                        continue
                    normalized.append({
                        'symbol': symbol,
                        'name': name,
                        'market': 'KR',
                        'currency': 'KRW'
                    })
            except Exception as kind_err:
                logger.warning(f"KIND listing fetch failed: {kind_err}")

            # Fallback source: FinanceDataReader listing.
            if not normalized and fdr is not None:
                try:
                    listing = fdr.StockListing('KRX')
                    for _, row in listing.iterrows():
                        symbol = str(row.get('Code', '')).zfill(6)
                        name = str(row.get('Name', '')).strip()
                        if not symbol or not name:
                            continue
                        normalized.append({
                            'symbol': symbol,
                            'name': name,
                            'market': 'KR',
                            'currency': 'KRW'
                        })
                except Exception as fdr_err:
                    logger.warning(f"FinanceDataReader listing fetch failed: {fdr_err}")

            if not normalized:
                logger.warning("No KRX listing source available. Falling back to minimal KRX list.")
                normalized = [
                    {'symbol': '005930', 'name': '삼성전자', 'market': 'KR', 'currency': 'KRW'},
                    {'symbol': '000660', 'name': 'SK하이닉스', 'market': 'KR', 'currency': 'KRW'},
                    {'symbol': '051910', 'name': 'LG화학', 'market': 'KR', 'currency': 'KRW'},
                ]

            StockDataService._krx_cache = normalized
            StockDataService._krx_cache_expire_at = now + timedelta(minutes=30)
            return normalized[:limit]
        except Exception as e:
            logger.error(f"Error fetching KRX stocks: {e}")
            return []

    @staticmethod
    def get_kr_top_trading_value_stocks(limit=200):
        """Get KRX stocks ranked by trading value from Naver ranking pages."""
        if BeautifulSoup is None:
            logger.warning("bs4 is not available, cannot parse trading-value ranking.")
            return []

        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            items = []
            seen = set()
            page = 1

            while len(items) < max(20, limit) and page <= 10:
                url = f"https://finance.naver.com/sise/sise_deal_rank.naver?page={page}"
                response = requests.get(url, headers=headers, timeout=10)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, 'html.parser')
                links = soup.select("a[href*='item/main.naver?code=']")
                if not links:
                    break

                page_added = 0
                for anchor in links:
                    href = anchor.get('href', '')
                    match = re.search(r'code=(\d{6})', href)
                    if not match:
                        continue

                    symbol = match.group(1)
                    name = anchor.get_text(strip=True)
                    if not name:
                        continue

                    key = (symbol, name)
                    if key in seen:
                        continue
                    seen.add(key)
                    page_added += 1

                    items.append({
                        'symbol': symbol,
                        'name': name,
                        'market': 'KR',
                        'currency': 'KRW'
                    })

                    if len(items) >= limit:
                        break

                if page_added == 0:
                    break
                page += 1

            if len(items) < 20:
                fallback = StockDataService.get_krx_stocks(max(100, limit))
                fallback_seen = {(row['symbol'], row['name']) for row in items}
                for row in fallback:
                    key = (row.get('symbol'), row.get('name'))
                    if key in fallback_seen:
                        continue
                    items.append(row)
                    fallback_seen.add(key)
                    if len(items) >= limit:
                        break

            return items[:limit]
        except Exception as e:
            logger.warning(f"Error fetching KR top trading-value stocks: {e}")
            return []
    
    @staticmethod
    def get_us_stocks(limit=100):
        """Get list of top US stocks (S&P 500)"""
        try:
            # Popular US stocks
            popular_symbols = [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
                'META', 'NVDA', 'JPM', 'V', 'JNJ',
                'WMT', 'PG', 'MA', 'DIS', 'ADBE',
                'CRM', 'NFLX', 'INTC', 'AMD', 'CSCO'
            ][:limit]
            
            stocks = []
            symbol_name_map = {
                'AAPL': 'Apple Inc.',
                'MSFT': 'Microsoft Corporation',
                'GOOGL': 'Alphabet Inc.',
                'AMZN': 'Amazon.com, Inc.',
                'TSLA': 'Tesla, Inc.',
                'META': 'Meta Platforms, Inc.',
                'NVDA': 'NVIDIA Corporation',
                'JPM': 'JPMorgan Chase & Co.',
                'V': 'Visa Inc.',
                'JNJ': 'Johnson & Johnson',
                'WMT': 'Walmart Inc.',
                'PG': 'Procter & Gamble Co.',
                'MA': 'Mastercard Incorporated',
                'DIS': 'The Walt Disney Company',
                'ADBE': 'Adobe Inc.',
                'CRM': 'Salesforce, Inc.',
                'NFLX': 'Netflix, Inc.',
                'INTC': 'Intel Corporation',
                'AMD': 'Advanced Micro Devices, Inc.',
                'CSCO': 'Cisco Systems, Inc.',
            }
            for symbol in popular_symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    stocks.append({
                        'symbol': symbol,
                        'name': info.get('longName', symbol),
                        'market': 'US',
                        'currency': 'USD',
                        'sector': info.get('sector', 'N/A')
                    })
                except:
                    pass

            if len(stocks) < max(5, min(20, limit)):
                existing = {row['symbol'] for row in stocks}
                for symbol in popular_symbols:
                    if symbol in existing:
                        continue
                    stocks.append({
                        'symbol': symbol,
                        'name': symbol_name_map.get(symbol, symbol),
                        'market': 'US',
                        'currency': 'USD',
                        'sector': 'N/A'
                    })
                    if len(stocks) >= limit:
                        break
            
            return stocks[:limit]
        except Exception as e:
            logger.error(f"Error fetching US stocks: {e}")
            return []
    
    @staticmethod
    def _build_ticker(symbol, market='US'):
        if market == 'US':
            return yf.Ticker(symbol)
        # KR can be either KOSPI(.KS) or KOSDAQ(.KQ).
        for suffix in ['.KS', '.KQ']:
            try:
                ticker = yf.Ticker(f"{symbol}{suffix}")
                hist = ticker.history(period='5d')
                if hist is not None and not hist.empty:
                    return ticker
            except Exception:
                continue
        return yf.Ticker(f"{symbol}.KS")

    @staticmethod
    def _fetch_history(ticker, period):
        hist = ticker.history(period=period)
        if hist is None or hist.empty:
            try:
                return yf.download(ticker.ticker, period=period)
            except Exception:
                return hist
        return hist

    @staticmethod
    def get_stock_price(symbol, market='US', period='1mo'):
        """Get current stock price and recent history"""
        try:
            if market == 'KR':
                hist = StockDataService._fetch_kr_history(symbol, period)
                current_price = hist['Close'].iloc[-1] if hist is not None and len(hist) > 0 else None
                previous_close = float(hist['Close'].iloc[-2]) if hist is not None and len(hist) > 1 else None
                hist_1y = StockDataService._fetch_kr_history(symbol, '1y')
                high_52week = float(hist_1y['High'].max()) if hist_1y is not None and len(hist_1y) > 0 else None
                low_52week = float(hist_1y['Low'].min()) if hist_1y is not None and len(hist_1y) > 0 else None

                return {
                    'symbol': symbol,
                    'market': market,
                    'currency': 'KRW',
                    'current_price': float(current_price) if current_price is not None else None,
                    'previous_close': previous_close,
                    'high_52week': high_52week,
                    'low_52week': low_52week,
                    'pe_ratio': None,
                    'market_cap': None,
                    'last_update': datetime.utcnow().isoformat()
                }

            hist = StockDataService._fetch_us_chart(symbol, period='1mo', interval='1d')
            current_price = float(hist['Close'].iloc[-1]) if hist is not None and len(hist) > 0 else None
            previous_close = float(hist['Close'].iloc[-2]) if hist is not None and len(hist) > 1 else None

            hist_1y = StockDataService._fetch_us_chart(symbol, period='1y', interval='1d')
            high_52week = float(hist_1y['High'].max()) if hist_1y is not None and len(hist_1y) > 0 else None
            low_52week = float(hist_1y['Low'].min()) if hist_1y is not None and len(hist_1y) > 0 else None

            return {
                'symbol': symbol,
                'market': market,
                'currency': 'USD',
                'current_price': current_price,
                'previous_close': previous_close,
                'high_52week': high_52week,
                'low_52week': low_52week,
                'pe_ratio': None,
                'market_cap': None,
                'last_update': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error fetching stock price for {symbol}: {e}")
            return None

    @staticmethod
    def get_historical_prices(symbol, market='US', period='1y'):
        """Get historical prices for charting"""
        try:
            if market == 'KR':
                hist = StockDataService._fetch_kr_history(symbol, period)
            else:
                hist = StockDataService._fetch_us_chart(symbol, period=period, interval='1d')
            if hist is None or hist.empty:
                logger.warning(f"No historical price data for {symbol}")
                return []

            prices = []
            for date, row in hist.iterrows():
                prices.append({
                    'date': date.isoformat(),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume'])
                })

            return prices
        except Exception as e:
            logger.error(f"Error fetching historical prices for {symbol}: {e}")
            return []
    
    @staticmethod
    def search_stocks(query, market=None):
        """Search for stocks by name or symbol"""
        market = market if market else None
        try:
            normalized_query = (query or '').strip()
            normalized_query_lower = normalized_query.lower()
            normalized_query_compact = normalized_query_lower.replace(' ', '')

            results = []
            
            if market is None or market == 'KR':
                # Search in Korean stocks
                try:
                    krx_stocks = StockDataService.get_krx_stocks(5000)
                    filtered = [
                        s for s in krx_stocks
                        if normalized_query_lower in s.get('symbol', '').lower()
                        or normalized_query_lower in s.get('name', '').lower()
                        or normalized_query_compact in s.get('name', '').lower().replace(' ', '')
                    ]
                    results.extend(filtered[:30])
                except:
                    pass
            
            if market is None or market == 'US':
                # Search in US stocks using Yahoo search API
                try:
                    us_results = StockDataService._search_us_stocks(normalized_query, limit=20)
                    results.extend(us_results)
                except Exception as e:
                    logger.warning(f"US stock search did not return data for {normalized_query.upper()}: {e}")
            
            return results
        except Exception as e:
            logger.error(f"Error searching stocks: {e}")
            return []
