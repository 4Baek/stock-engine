"""
Database models for Stock Trading Engine
"""
from app import db
from datetime import datetime

class Stock(db.Model):
    """Stock information model"""
    __tablename__ = 'stocks'
    
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    market = db.Column(db.String(10), nullable=False)  # 'KR' or 'US'
    sector = db.Column(db.String(100))
    currency = db.Column(db.String(5), default='KRW')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    portfolios = db.relationship('PortfolioHolding', backref='stock', lazy=True, cascade='all, delete-orphan')
    trades = db.relationship('Trade', backref='stock', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'symbol': self.symbol,
            'name': self.name,
            'market': self.market,
            'sector': self.sector,
            'currency': self.currency
        }

class Portfolio(db.Model):
    """User portfolio model"""
    __tablename__ = 'portfolios'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), default='My Portfolio')
    balance = db.Column(db.Float, default=10000000.0)  # Starting balance in KRW
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    holdings = db.relationship('PortfolioHolding', backref='portfolio', lazy=True, cascade='all, delete-orphan')
    trades = db.relationship('Trade', backref='portfolio', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'balance': self.balance,
            'holdings': [h.to_dict() for h in self.holdings],
            'created_at': self.created_at.isoformat()
        }

class PortfolioHolding(db.Model):
    """Stock holdings in portfolio"""
    __tablename__ = 'portfolio_holdings'
    
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolios.id'), nullable=False)
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False, default=0)
    avg_buy_price = db.Column(db.Float, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'stock': self.stock.to_dict(),
            'quantity': self.quantity,
            'avg_buy_price': self.avg_buy_price,
            'total_value': self.quantity * self.avg_buy_price
        }

class Trade(db.Model):
    """Trade history model"""
    __tablename__ = 'trades'
    
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolios.id'), nullable=False)
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False)
    trade_type = db.Column(db.String(10), nullable=False)  # 'BUY' or 'SELL'
    quantity = db.Column(db.Float, nullable=False)
    price = db.Column(db.Float, nullable=False)
    total_value = db.Column(db.Float, nullable=False)
    commission = db.Column(db.Float, default=0)
    trade_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'stock': self.stock.to_dict(),
            'trade_type': self.trade_type,
            'quantity': self.quantity,
            'price': self.price,
            'total_value': self.total_value,
            'commission': self.commission,
            'trade_date': self.trade_date.isoformat()
        }

class StockPrice(db.Model):
    """Historical stock prices"""
    __tablename__ = 'stock_prices'
    
    id = db.Column(db.Integer, primary_key=True)
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.id'), nullable=False, index=True)
    date = db.Column(db.DateTime, nullable=False)
    open_price = db.Column(db.Float, nullable=False)
    high_price = db.Column(db.Float, nullable=False)
    low_price = db.Column(db.Float, nullable=False)
    close_price = db.Column(db.Float, nullable=False)
    volume = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('stock_id', 'date', name='_stock_date_uc'),)
    
    def to_dict(self):
        return {
            'date': self.date.isoformat(),
            'open': self.open_price,
            'high': self.high_price,
            'low': self.low_price,
            'close': self.close_price,
            'volume': self.volume
        }
