"""
Data initialization and migration utilities
"""
from app import db, create_app
from models import Stock, Portfolio, Trade, StockPrice
from services.stock_data_service import StockDataService

def initialize_database():
    """Initialize database with sample data"""
    app = create_app()
    
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Import Korean stocks
        print("한국 주식 데이터 로드 중...")
        kr_stocks = StockDataService.get_krx_stocks(100)
        for stock_data in kr_stocks:
            existing = Stock.query.filter_by(symbol=stock_data['Code']).first()
            if not existing:
                stock = Stock(
                    symbol=stock_data['Code'],
                    name=stock_data['Name'],
                    market='KR',
                    currency='KRW',
                    sector=stock_data.get('sector', 'N/A')
                )
                db.session.add(stock)
        
        # Import US stocks
        print("미국 주식 데이터 로드 중...")
        us_stocks = StockDataService.get_us_stocks(50)
        for stock_data in us_stocks:
            existing = Stock.query.filter_by(symbol=stock_data.get('Code', stock_data.get('symbol'))).first()
            if not existing:
                stock = Stock(
                    symbol=stock_data.get('Code', stock_data.get('symbol')),
                    name=stock_data.get('Name', stock_data.get('name')),
                    market='US',
                    currency='USD',
                    sector=stock_data.get('sector', 'N/A')
                )
                db.session.add(stock)
        
        db.session.commit()
        print("✅ 데이터베이스 초기화 완료!")

if __name__ == '__main__':
    initialize_database()
