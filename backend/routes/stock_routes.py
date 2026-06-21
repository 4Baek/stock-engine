"""
Stock-related routes
"""
from flask import request, jsonify
from routes import stock_bp
from services.stock_data_service import StockDataService
from models import Stock
from app import db
import logging

logger = logging.getLogger(__name__)

@stock_bp.route('/search', methods=['GET'])
def search_stocks():
    """Search for stocks"""
    query = request.args.get('q', '')
    market = request.args.get('market', None)
    market = market if market else None
    
    if not query:
        return jsonify({'error': 'Query parameter required'}), 400
    
    results = StockDataService.search_stocks(query, market)
    return jsonify({'results': results}), 200

@stock_bp.route('/search/kr', methods=['GET'])
def search_kr_stocks():
    """Search Korean stocks only"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query parameter required'}), 400

    results = StockDataService.search_stocks(query, 'KR')
    return jsonify({'results': results}), 200

@stock_bp.route('/search/us', methods=['GET'])
def search_us_stocks():
    """Search US stocks only"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query parameter required'}), 400

    results = StockDataService.search_stocks(query, 'US')
    return jsonify({'results': results}), 200

@stock_bp.route('/list/<market>', methods=['GET'])
def get_stock_list(market):
    """Get list of stocks for a market"""
    limit = request.args.get('limit', 50, type=int)
    
    if market == 'KR':
        stocks = StockDataService.get_krx_stocks(limit)
    elif market == 'US':
        stocks = StockDataService.get_us_stocks(limit)
    else:
        return jsonify({'error': 'Invalid market'}), 400
    
    return jsonify({'stocks': stocks}), 200

@stock_bp.route('/price/<symbol>', methods=['GET'])
def get_stock_price(symbol):
    """Get current stock price"""
    market = request.args.get('market', 'US')
    
    price_data = StockDataService.get_stock_price(symbol, market)
    if not price_data:
        return jsonify({'error': 'Stock not found'}), 404
    
    return jsonify(price_data), 200

@stock_bp.route('/history/<symbol>', methods=['GET'])
def get_stock_history(symbol):
    """Get historical prices for a stock"""
    market = request.args.get('market', 'US')
    period = request.args.get('period', '1y')
    
    prices = StockDataService.get_historical_prices(symbol, market, period)
    return jsonify({'symbol': symbol, 'prices': prices}), 200

@stock_bp.route('/exchange-rate', methods=['GET'])
def get_exchange_rate():
    """Get exchange rate by currency pair"""
    base = request.args.get('base', 'USD')
    quote = request.args.get('quote', 'KRW')

    data = StockDataService.get_exchange_rate(base, quote)
    if not data:
        return jsonify({'error': 'Exchange rate not available'}), 404

    return jsonify(data), 200

@stock_bp.route('/recommendations/bollinger', methods=['GET'])
def get_bollinger_recommendations():
    """Get Bollinger-band based stock recommendations"""
    market = request.args.get('market', 'KR')
    limit = request.args.get('limit', 6, type=int)
    config = {
        'min_score': request.args.get('min_score', 0, type=int),
        'universe_mode': request.args.get('universe_mode', 'top_value', type=str),
        'top_value_count': request.args.get('top_value_count', 200, type=int),
        'breakout_weight': request.args.get('breakout_weight', 35, type=int),
        'squeeze_weight': request.args.get('squeeze_weight', 20, type=int),
        'trend_weight': request.args.get('trend_weight', 15, type=int),
        'volume_weight': request.args.get('volume_weight', 15, type=int),
        'above_middle_weight': request.args.get('above_middle_weight', 10, type=int),
        'breakout_down_penalty': request.args.get('breakout_down_penalty', 20, type=int),
        'volume_threshold': request.args.get('volume_threshold', 1.3, type=float),
        'stop_loss_pct': request.args.get('stop_loss_pct', 5.0, type=float),
        'take_profit_pct': request.args.get('take_profit_pct', 12.0, type=float),
    }

    data = StockDataService.get_bollinger_recommendations(market=market, limit=limit, config=config)
    if data.get('error'):
        return jsonify({'error': data['error']}), 400

    return jsonify(data), 200

@stock_bp.route('/<symbol>/info', methods=['GET'])
def get_stock_info(symbol):
    """Get detailed stock information"""
    market = request.args.get('market', 'US')

    # Always include live price metrics for details page.
    price_data = StockDataService.get_stock_price(symbol, market)
    if not price_data:
        return jsonify({'error': 'Stock not found'}), 404

    try:
        stock = Stock.query.filter_by(symbol=symbol, market=market).first()
        if stock:
            price_data['name'] = stock.name
            price_data['sector'] = stock.sector
    except Exception as db_err:
        # Return live price data even if local DB metadata lookup fails.
        logger.warning(f"Stock metadata lookup failed for {symbol} ({market}): {db_err}")

    return jsonify(price_data), 200

@stock_bp.route('/sync/<market>', methods=['POST'])
def sync_stocks(market):
    """Sync stock list to database"""
    try:
        if market == 'KR':
            stocks = StockDataService.get_krx_stocks(1000)
        elif market == 'US':
            stocks = StockDataService.get_us_stocks(100)
        else:
            return jsonify({'error': 'Invalid market'}), 400
        
        count = 0
        for stock_data in stocks:
            existing = Stock.query.filter_by(
                symbol=stock_data.get('Code', stock_data.get('symbol'))
            ).first()
            
            if not existing:
                stock = Stock(
                    symbol=stock_data.get('Code', stock_data.get('symbol')),
                    name=stock_data.get('Name', stock_data.get('name')),
                    market=market,
                    sector=stock_data.get('sector', 'N/A'),
                    currency=stock_data.get('currency', 'KRW' if market == 'KR' else 'USD')
                )
                db.session.add(stock)
                count += 1
        
        db.session.commit()
        return jsonify({'message': f'Synced {count} new stocks'}), 200
    except Exception as e:
        logger.error(f"Error syncing stocks: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
