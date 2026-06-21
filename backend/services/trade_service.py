"""
Trade service - handles trading operations
"""
from app import db
from models import Trade, PortfolioHolding, Portfolio, Stock
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TradeService:
    """Service for trade operations"""
    
    @staticmethod
    def execute_buy(portfolio_id, stock_id, quantity, price, commission=0):
        """Execute a buy trade"""
        try:
            portfolio = Portfolio.query.get(portfolio_id)
            if not portfolio:
                return {'success': False, 'message': 'Portfolio not found'}
            
            total_cost = (quantity * price) + commission
            
            if portfolio.balance < total_cost:
                return {'success': False, 'message': 'Insufficient balance'}
            
            # Create trade record
            trade = Trade(
                portfolio_id=portfolio_id,
                stock_id=stock_id,
                trade_type='BUY',
                quantity=quantity,
                price=price,
                total_value=quantity * price,
                commission=commission
            )
            
            # Update portfolio
            portfolio.balance -= total_cost
            
            # Update holdings
            holding = PortfolioHolding.query.filter_by(
                portfolio_id=portfolio_id,
                stock_id=stock_id
            ).first()
            
            if holding:
                total_value = (holding.quantity * holding.avg_buy_price) + (quantity * price)
                holding.quantity += quantity
                holding.avg_buy_price = total_value / holding.quantity
            else:
                holding = PortfolioHolding(
                    portfolio_id=portfolio_id,
                    stock_id=stock_id,
                    quantity=quantity,
                    avg_buy_price=price
                )
                db.session.add(holding)
            
            db.session.add(trade)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Buy trade executed',
                'trade_id': trade.id,
                'remaining_balance': portfolio.balance
            }
        except Exception as e:
            logger.error(f"Error executing buy trade: {e}")
            db.session.rollback()
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def execute_sell(portfolio_id, stock_id, quantity, price, commission=0):
        """Execute a sell trade"""
        try:
            portfolio = Portfolio.query.get(portfolio_id)
            if not portfolio:
                return {'success': False, 'message': 'Portfolio not found'}
            
            holding = PortfolioHolding.query.filter_by(
                portfolio_id=portfolio_id,
                stock_id=stock_id
            ).first()
            
            if not holding or holding.quantity < quantity:
                return {'success': False, 'message': 'Insufficient holdings'}
            
            # Create trade record
            trade = Trade(
                portfolio_id=portfolio_id,
                stock_id=stock_id,
                trade_type='SELL',
                quantity=quantity,
                price=price,
                total_value=quantity * price,
                commission=commission
            )
            
            # Update portfolio balance
            total_proceeds = (quantity * price) - commission
            portfolio.balance += total_proceeds
            
            # Update holdings
            holding.quantity -= quantity
            if holding.quantity == 0:
                db.session.delete(holding)
            
            db.session.add(trade)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'Sell trade executed',
                'trade_id': trade.id,
                'remaining_balance': portfolio.balance
            }
        except Exception as e:
            logger.error(f"Error executing sell trade: {e}")
            db.session.rollback()
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def get_trade_history(portfolio_id, limit=50):
        """Get trade history for portfolio"""
        try:
            trades = Trade.query.filter_by(portfolio_id=portfolio_id).order_by(
                Trade.trade_date.desc()
            ).limit(limit).all()
            
            return [trade.to_dict() for trade in trades]
        except Exception as e:
            logger.error(f"Error getting trade history: {e}")
            return []
