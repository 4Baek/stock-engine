<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Stock Engine Project Instructions

## 프로젝트 개요
주식 트레이드 웹 애플리케이션으로 Python Flask 백엔드와 React 프론트엔드로 구성됨.
한국(KRX) 및 미국(NASDAQ/NYSE) 주식을 지원함.

## 개발 환경
- **백엔드**: Python 3.8+, Flask, SQLAlchemy, SQLite
- **프론트엔드**: React 18, Vite, Tailwind CSS
- **데이터**: yfinance, FinanceDataReader

## 디렉토리 구조
```
stock-engine/
├── backend/           # Flask 백엔드
│   ├── app.py        # 메인 애플리케이션
│   ├── config.py     # 설정
│   ├── models/       # 데이터베이스 모델
│   ├── routes/       # API 라우트
│   ├── services/     # 비즈니스 로직
│   └── requirements.txt
├── frontend/          # React 프론트엔드
│   ├── src/
│   └── package.json
├── run.py            # 백엔드 실행 스크립트
└── README.md
```

## 주요 개발 원칙
1. **백엔드**: RESTful API 설계, services 계층으로 비즈니스 로직 분리
2. **프론트엔드**: 컴포넌트 기반 아키텍처, API 서비스 계층 분리
3. **데이터**: 모든 API는 JSON 응답
4. **오류 처리**: try-catch 및 명확한 오류 메시지 제공

## API 설계 가이드
- `GET /api/stocks/search` - 검색
- `GET /api/stocks/list/<market>` - 리스트 조회
- `GET /api/stocks/price/<symbol>` - 상세 정보
- `POST /api/portfolio/` - 생성
- `GET /api/portfolio/<id>` - 조회

## 커밋 컨벤션
- ✨ `feat`: 새 기능
- 🐛 `fix`: 버그 수정
- 📚 `docs`: 문서 추가
- 🎨 `style`: 코드 포맷팅
- ♻️ `refactor`: 코드 리팩토링

## 주의사항
- API는 항상 데이터베이스에서 먼저 확인하고, 없으면 외부 API 호출
- 모든 거래는 포트폴리오 잔액 확인 필수
- 외부 API 호출은 예외 처리 필요
