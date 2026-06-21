# GitHub + AWS 배포 가이드

이 문서는 현재 프로젝트를 GitHub에 올리고, AWS에 배포하는 가장 간단한 경로를 정리합니다.

## 1) GitHub 업로드

현재 로컬 저장소 초기화와 첫 커밋은 완료되었습니다.

다음 명령만 실행하면 GitHub로 업로드됩니다.

```bash
git remote add origin https://github.com/<YOUR_ID>/<YOUR_REPO>.git
git push -u origin main
```

원격 저장소를 이미 추가한 경우:

```bash
git remote set-url origin https://github.com/<YOUR_ID>/<YOUR_REPO>.git
git push -u origin main
```

## 2) 백엔드 AWS 배포 (App Runner)

백엔드는 `backend/Dockerfile` 기반으로 App Runner에 배포합니다.

1. AWS Console > App Runner > Create service
2. Source: GitHub repository 선택
3. 리포지토리/브랜치: 이 프로젝트의 `main`
4. Source directory: `backend`
5. Build/Start는 Dockerfile 자동 감지 사용
6. Port: `5000`
7. Create service

배포 완료 후 App Runner URL을 확인합니다.
예: `https://xxxx.ap-northeast-2.awsapprunner.com`

## 3) 프론트엔드 AWS 배포 (Amplify Hosting)

프론트엔드는 Amplify로 정적 배포합니다.

1. AWS Console > Amplify > New app > Host web app
2. GitHub 연결 후 동일 리포지토리/브랜치 `main` 선택
3. Monorepo 설정에서 App root를 `frontend`로 설정
4. 빌드 설정은 루트의 `amplify.yml` 사용
5. 환경 변수 추가:
   - `VITE_API_URL=https://<APP_RUNNER_URL>/api`
6. Deploy

## 4) 배포 후 확인

- 백엔드 헬스체크:
  - `https://<APP_RUNNER_URL>/api/health`
- 프론트 접속 후 API 호출 정상 동작 확인

## 5) 자주 쓰는 업데이트 명령

코드 수정 후 다시 배포:

```bash
git add .
git commit -m "feat: update"
git push
```

App Runner/Amplify는 Git 연동 시 자동 재배포됩니다.
