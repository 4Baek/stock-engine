import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db

if __name__ == '__main__':
    app = create_app()
    
    with app.app_context():
        db.create_all()
    
    print("✅ Stock Engine 백엔드 서버 시작됨")
    print("API 주소: http://localhost:5000")
    print("Health Check: http://localhost:5000/api/health")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
