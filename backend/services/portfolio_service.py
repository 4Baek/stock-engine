"""
Portfolio service - manages portfolio operations
"""
from app import db
from models import Portfolio, PortfolioHolding, Trade, Stock
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PortfolioService:
    """Service for portfolio management"""
    
    @staticmethod
    def create_portfolio(user_id, name='My Portfolio', initial_balance=10000000):
        """Create a new portfolio"""
        try:
            portfolio = Portfolio(
                user_id=user_id,
                name=name,
                balance=initial_balance
            )
            db.session.add(portfolio)
            db.session.commit()
            return portfolio
        except Exception as e:
            logger.error(f"Error creating portfolio: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def get_portfolio(user_id):
        """Get user's portfolio"""
        return Portfolio.query.filter_by(user_id=user_id).first()
    
    @staticmethod
    def add_stock_to_portfolio(portfolio_id, stock_id, quantity, buy_price):
        """Add stock to portfolio"""
        try:
            holding = PortfolioHolding.query.filter_by(
                portfolio_id=portfolio_id,
                stock_id=stock_id
            ).first()
            
            if holding:
                # Update average price
                total_value = (holding.quantity * holding.avg_buy_price) + (quantity * buy_price)
                holding.quantity += quantity
                holding.avg_buy_price = total_value / holding.quantity
            else:
                holding = PortfolioHolding(
                    portfolio_id=portfolio_id,
                    stock_id=stock_id,
                    quantity=quantity,
                    avg_buy_price=buy_price
                )
                db.session.add(holding)
            
            db.session.commit()
            return holding
        except Exception as e:
            logger.error(f"Error adding stock to portfolio: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def remove_stock_from_portfolio(portfolio_id, stock_id, quantity):
        """Remove stock from portfolio"""
        try:
            holding = PortfolioHolding.query.filter_by(
                portfolio_id=portfolio_id,
                stock_id=stock_id
            ).first()
            
            if not holding:
                return None
            
            if holding.quantity > quantity:
                holding.quantity -= quantity
                db.session.commit()
            else:
                db.session.delete(holding)
                db.session.commit()
            
            return holding
        except Exception as e:
            logger.error(f"Error removing stock from portfolio: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def get_portfolio_stats(portfolio_id):
        """Calculate portfolio statistics"""
        try:
            portfolio = Portfolio.query.get(portfolio_id)
            if not portfolio:
                return None
            
            total_invested = 0
            current_value = 0
            
            for holding in portfolio.holdings:
                total_invested += holding.quantity * holding.avg_buy_price
                # In real implementation, fetch current price
                current_value += holding.quantity * holding.avg_buy_price
            
            return {
                'portfolio_id': portfolio_id,
                'balance': portfolio.balance,
                'total_invested': total_invested,
                'current_value': current_value,
                'total_holdings': len(portfolio.holdings),
                'trades_count': len(portfolio.trades),
                'gain_loss': current_value - total_invested,
                'gain_loss_percent': ((current_value - total_invested) / total_invested * 100) if total_invested > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error calculating portfolio stats: {e}")
            return None
