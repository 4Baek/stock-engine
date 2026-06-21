"""
Utility functions for Stock Engine
"""
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def get_logger(name):
    """Get a logger instance"""
    return logging.getLogger(name)

def format_currency(value, currency='USD'):
    """Format value as currency"""
    if currency == 'KRW':
        return f"₩{value:,.0f}" if value else "₩0"
    else:
        return f"${value:,.2f}" if value else "$0.00"

def calculate_percentage_change(current, previous):
    """Calculate percentage change"""
    if not previous or previous == 0:
        return 0
    return ((current - previous) / previous) * 100

def format_market_label(market):
    """Get market label"""
    return "한국" if market == "KR" else "미국"
