"""
Routes package
"""
from flask import Blueprint

# Create blueprints
stock_bp = Blueprint('stocks', __name__, url_prefix='/api/stocks')
portfolio_bp = Blueprint('portfolio', __name__, url_prefix='/api/portfolio')
trade_bp = Blueprint('trade', __name__, url_prefix='/api/trade')

# Import routes to register them
from .stock_routes import *
from .portfolio_routes import *
from .trade_routes import *

__all__ = ['stock_bp', 'portfolio_bp', 'trade_bp']
