# Stock Trading Engine

Python 기반의 풀 스택 주식 트레이드 웹 애플리케이션입니다. 한국 및 미국 주식 시장을 지원합니다.

## 🚀 기능

### 현재 구현된 기능
- ✅ **주식 데이터 통합**
  - 한국 주식 (KOSPI, KOSDAQ)
  - 미국 주식 (S&P 500)
  - 실시간 가격 정보
  - 차트 데이터

- ✅ **포트폴리오 관리**
  - 포트폴리오 생성 및 관리
  - 보유 종목 추적
  - 자산 현황 대시보드

- ✅ **거래 기록**
  - 매수/매도 기록
  - 거래 이력 조회

### 향후 추가 예정
- 🔄 **백테스팅** - 과거 데이터로 전략 테스트
- 🤖 **AI 추천** - 머신러닝 기반 주식 추천
- 📊 **기술적 분석** - 다양한 지표 계산
- 🔔 **알림** - 가격 변동 알림
- 🌐 **실시간 거래** - 브로커 API 연동

## 📋 프로젝트 구조

```
stock-engine/
├── backend/                    # Python Flask 백엔드
│   ├── app.py                 # Flask 애플리케이션
│   ├── config.py              # 설정
│   ├── requirements.txt        # 의존성
│   ├── models/                # 데이터베이스 모델
│   ├── routes/                # API 라우트
│   ├── services/              # 비즈니스 로직
│   └── utils/                 # 유틸리티
│
├── frontend/                   # React 프론트엔드
│   ├── src/
│   │   ├── components/        # React 컴포넌트
│   │   ├── pages/             # 페이지
│   │   ├── services/          # API 클라이언트
│   │   └── App.jsx            # 메인 앱
│   ├── package.json           # 의존성
│   └── vite.config.js         # Vite 설정
│
└── README.md
```

## 🔧 설치 및 실행

### 사전 요구사항
- Python 3.8+
- Node.js 16+
- npm 또는 yarn

### 백엔드 설정

1. **가상 환경 생성**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. **의존성 설치**
```bash
pip install -r requirements.txt
```

3. **환경 변수 설정**
```bash
cp .env.example .env
# .env 파일 수정 (필요시)
```

4. **백엔드 서버 실행**
```bash
python ../run.py
```

서버는 `http://localhost:5000`에서 실행됩니다.

### 프론트엔드 설정

1. **의존성 설치**
```bash
cd frontend
npm install
```

2. **개발 서버 실행**
```bash
npm run dev
```

앱은 `http://localhost:3000`에서 실행됩니다.

## 📡 API 엔드포인트

### 주식 데이터
- `GET /api/stocks/search?q=AAPL` - 주식 검색
- `GET /api/stocks/list/<market>` - 시장별 주식 목록
- `GET /api/stocks/price/<symbol>` - 현재 가격
- `GET /api/stocks/history/<symbol>` - 가격 이력

### 포트폴리오
- `POST /api/portfolio/` - 포트폴리오 생성
- `GET /api/portfolio/<user_id>` - 포트폴리오 조회
- `GET /api/portfolio/<user_id>/stats` - 통계
- `GET /api/portfolio/<user_id>/holdings` - 보유 종목

### 거래
- `POST /api/trade/buy` - 매수
- `POST /api/trade/sell` - 매도
- `GET /api/trade/<portfolio_id>/history` - 거래 이력

## 🗄️ 데이터베이스

SQLite를 사용합니다. 자동으로 생성됩니다.

주요 테이블:
- `stocks` - 주식 정보
- `portfolios` - 포트폴리오
- `portfolio_holdings` - 보유 종목
- `trades` - 거래 기록
- `stock_prices` - 과거 가격

## 🎨 기술 스택

**백엔드:**
- Flask
- SQLAlchemy
- yfinance
- FinanceDataReader

**프론트엔드:**
- React 18
- Vite
- Tailwind CSS
- Recharts
- Axios

## 📝 사용 예시

### 1. 포트폴리오 생성
```javascript
const portfolio = await portfolioService.createPortfolio(
  'user-123',
  'My Portfolio',
  10000000  // 1천만원 초기 자본
);
```

### 2. 주식 검색
```javascript
const results = await stockService.searchStocks('AAPL', 'US');
```

### 3. 주식 가격 확인
```javascript
const price = await stockService.getStockPrice('AAPL', 'US');
```

### 4. 거래 실행
```javascript
const trade = await tradeService.executeBuy(
  portfolioId,
  stockId,
  100,      // 수량
  150.50,   // 가격
  0         // 수수료
);
```

## 🤝 기여

이 프로젝트는 지속적으로 개선 중입니다. 개선 사항이나 버그 리포트는 환영합니다!

## 📄 라이선스

MIT License

## 📞 지원

문제가 있거나 질문이 있으면 이슈를 생성해주세요.

---

**마지막 업데이트:** 2024년 6월 20일
