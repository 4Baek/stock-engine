"""
Trade-related routes
"""
from flask import request, jsonify
from routes import trade_bp
from services.trade_service import TradeService
from models import Portfolio
import logging

logger = logging.getLogger(__name__)

@trade_bp.route('/buy', methods=['POST'])
def execute_buy():
    """Execute a buy trade"""
    data = request.get_json()
    
    portfolio_id = data.get('portfolio_id')
    stock_id = data.get('stock_id')
    quantity = data.get('quantity')
    price = data.get('price')
    commission = data.get('commission', 0)
    
    if not all([portfolio_id, stock_id, quantity, price]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = TradeService.execute_buy(portfolio_id, stock_id, quantity, price, commission)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@trade_bp.route('/sell', methods=['POST'])
def execute_sell():
    """Execute a sell trade"""
    data = request.get_json()
    
    portfolio_id = data.get('portfolio_id')
    stock_id = data.get('stock_id')
    quantity = data.get('quantity')
    price = data.get('price')
    commission = data.get('commission', 0)
    
    if not all([portfolio_id, stock_id, quantity, price]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    result = TradeService.execute_sell(portfolio_id, stock_id, quantity, price, commission)
    
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 400

@trade_bp.route('/<int:portfolio_id>/history', methods=['GET'])
def get_trade_history(portfolio_id):
    """Get trade history"""
    limit = request.args.get('limit', 50, type=int)
    
    trades = TradeService.get_trade_history(portfolio_id, limit)
    return jsonify({'trades': trades}), 200
