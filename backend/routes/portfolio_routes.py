"""
Portfolio-related routes
"""
from flask import request, jsonify
from routes import portfolio_bp
from services.portfolio_service import PortfolioService
from models import Portfolio
from app import db
import logging

logger = logging.getLogger(__name__)

@portfolio_bp.route('/', methods=['POST'])
def create_portfolio():
    """Create a new portfolio"""
    data = request.get_json()
    
    user_id = data.get('user_id')
    name = data.get('name', 'My Portfolio')
    initial_balance = data.get('initial_balance', 10000000)
    
    if not user_id:
        return jsonify({'error': 'user_id is required'}), 400
    
    # Check if portfolio already exists
    existing = Portfolio.query.filter_by(user_id=user_id).first()
    if existing:
        return jsonify({'error': 'Portfolio already exists for this user'}), 400
    
    portfolio = PortfolioService.create_portfolio(user_id, name, initial_balance)
    if not portfolio:
        return jsonify({'error': 'Failed to create portfolio'}), 500
    
    return jsonify(portfolio.to_dict()), 201

@portfolio_bp.route('/<user_id>', methods=['GET'])
def get_portfolio(user_id):
    """Get user's portfolio"""
    portfolio = PortfolioService.get_portfolio(user_id)
    if not portfolio:
        return jsonify({'error': 'Portfolio not found'}), 404
    
    return jsonify(portfolio.to_dict()), 200

@portfolio_bp.route('/<user_id>/stats', methods=['GET'])
def get_portfolio_stats(user_id):
    """Get portfolio statistics"""
    portfolio = PortfolioService.get_portfolio(user_id)
    if not portfolio:
        return jsonify({'error': 'Portfolio not found'}), 404
    
    stats = PortfolioService.get_portfolio_stats(portfolio.id)
    return jsonify(stats), 200

@portfolio_bp.route('/<user_id>/holdings', methods=['GET'])
def get_holdings(user_id):
    """Get current holdings"""
    portfolio = PortfolioService.get_portfolio(user_id)
    if not portfolio:
        return jsonify({'error': 'Portfolio not found'}), 404
    
    holdings = [h.to_dict() for h in portfolio.holdings]
    return jsonify({'holdings': holdings}), 200

@portfolio_bp.route('/<int:portfolio_id>/add-holding', methods=['POST'])
def add_holding(portfolio_id):
    """Add stock holding to portfolio"""
    data = request.get_json()
    
    stock_id = data.get('stock_id')
    quantity = data.get('quantity')
    buy_price = data.get('buy_price')
    
    if not all([stock_id, quantity, buy_price]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    holding = PortfolioService.add_stock_to_portfolio(portfolio_id, stock_id, quantity, buy_price)
    if not holding:
        return jsonify({'error': 'Failed to add holding'}), 500
    
    return jsonify(holding.to_dict()), 201

@portfolio_bp.route('/<int:portfolio_id>/remove-holding', methods=['POST'])
def remove_holding(portfolio_id):
    """Remove stock holding from portfolio"""
    data = request.get_json()
    
    stock_id = data.get('stock_id')
    quantity = data.get('quantity')
    
    if not all([stock_id, quantity]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    holding = PortfolioService.remove_stock_from_portfolio(portfolio_id, stock_id, quantity)
    if not holding:
        return jsonify({'error': 'Failed to remove holding'}), 500
    
    return jsonify({'message': 'Holding removed successfully'}), 200
