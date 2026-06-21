# Stock Engine 시작 가이드

## ⚡ 빠른 시작

### 1️⃣ 터미널 1: 백엔드 실행

```bash
# 터미널을 stock-engine 디렉토리에서 열기

# Python 가상 환경 생성 (처음 한 번만)
python -m venv backend/venv

# 가상 환경 활성화
source backend/venv/bin/activate
# Windows: backend\venv\Scripts\activate

# 의존성 설치
pip install -r backend/requirements.txt

# 백엔드 서버 실행
python run.py
```

✅ 완료되면 `http://localhost:5000/api/health` 확인

### 2️⃣ 터미널 2: 프론트엔드 실행

```bash
cd frontend

# 의존성 설치 (처음 한 번만)
npm install

# 개발 서버 실행
npm run dev
```

✅ 완료되면 `http://localhost:3000` 열기

## 🎯 첫 번째 사용 방법

1. **포트폴리오 생성**
   - 대시보드에서 "포트폴리오 생성" 클릭
   - 초기 자본 설정 (예: 1천만원)

2. **주식 검색**
   - "주식 검색" 탭에서 주식 검색
   - 한국(KR) 또는 미국(US) 선택 가능
   - 예: AAPL, MSFT, 삼성전자, SK하이닉스

3. **주식 매수**
   - 검색한 주식 선택
   - 수량과 가격 입력
   - "매수" 버튼 클릭

4. **포트폴리오 확인**
   - 대시보드에서 보유 종목과 손익 확인

## 📚 주요 기능

| 기능 | 설명 | 위치 |
|------|------|------|
| 대시보드 | 포트폴리오 개요 및 통계 | `/` |
| 주식 검색 | 한국/미국 주식 검색 및 차트 | `/stocks` |
| 포트폴리오 | 보유 종목 관리 | `/portfolio` |
| 거래 | 매수/매도 기록 | `/trade` |

## 🔧 개발 팁

### 백엔드 API 테스트 (Postman/curl)

```bash
# 건강 체크
curl http://localhost:5000/api/health

# 주식 검색
curl "http://localhost:5000/api/stocks/search?q=AAPL&market=US"

# 주식 가격
curl "http://localhost:5000/api/stocks/price/AAPL?market=US"
```

### 프론트엔드 구조

```
frontend/src/
├── components/     # 재사용 가능한 UI 컴포넌트
├── pages/         # 페이지 컴포넌트
├── services/      # API 호출 로직
├── hooks/         # 커스텀 훅 (향후 추가)
└── App.jsx        # 메인 앱
```

## ⚠️ 자주 묻는 질문

**Q: 포트가 이미 사용 중이라면?**
```bash
# 백엔드 포트 변경: app.py에서 port=5001
# 프론트엔드 포트 변경: vite.config.js에서 port: 3001
```

**Q: 데이터베이스 초기화하려면?**
```bash
# backend/ 디렉토리에서 stock_engine.db 파일 삭제
rm stock_engine.db  # Linux/Mac
del stock_engine.db  # Windows
```

**Q: 새로운 의존성을 추가하려면?**
```bash
# 백엔드
cd backend
pip install 새로운_패키지
pip freeze > requirements.txt

# 프론트엔드
cd frontend
npm install 새로운_패키지
```

## 🚀 다음 단계

1. **사용자 인증** - 로그인/회원가입 추가
2. **실시간 업데이트** - WebSocket 통합
3. **고급 분석** - 기술적 지표 추가
4. **배포** - Docker 및 클라우드 배포

## 📞 지원

문제가 발생하면:
1. 브라우저 콘솔에서 오류 확인
2. 백엔드 터미널에서 로그 확인
3. `README.md` 참고

행운을 빕니다! 🎉
