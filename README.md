# MathTutor

평균 개념을 **예상 → 관찰 → 장면 재구성 → 직접 만들기**로 학습하는 정적 웹 앱입니다. 현재 구현은 새 작업 지시서의 **v1 / E0·E1**입니다.

## 버전

- **v0**: 이전 평균 실험실을 [`versions/v0`](versions/v0)에 고정 보존했습니다. Git 태그 [`v0`](https://github.com/jinhoofkepco/MathTutor/tree/v0)도 같은 보존 시점을 가리킵니다. 기존 Sites 주소는 v0 상태를 유지합니다.
- **v1**: [`deliverables`](deliverables)에 E0·E1 앱, Blender 원본, GLB, MP4, 한국어 음성, 대본과 검수 문서를 넣었습니다.
- **작업 지시서**: [`mean_concept_video_work_order.md`](mean_concept_video_work_order.md). 제공받은 원문을 수정 없이 저장했습니다. 다음 리비전에서는 이 파일을 업데이트하면 됩니다.

## 바로 실행

이미 빌드된 결과가 포함되어 있어 Node 설치 없이 실행할 수 있습니다.

```sh
python3 -m http.server 8000 --directory deliverables
```

브라우저에서 `http://localhost:8000/web/index.html`을 엽니다. 교실 모드는 `http://localhost:8000/web/index.html?classroom=1`입니다. `file://`로 직접 열지 말고 정적 서버를 사용하세요. 실행 중 외부 API·CDN·TTS 서비스 호출은 없으며, 모든 모델·음성·영상·라이브러리는 저장소에 포함되어 있습니다.

## 구현한 학습

- **E0**: 두 팀을 공평하게 비교할 방법을 직접 적고, 두 팀의 고른 높이를 예상합니다. 친구는 등장하지 않습니다. A의 24/3=8과 B의 35/5=7을 관찰하고, 처음 A와 같은 몫을 가진 4명 팀을 만듭니다.
- **E1**: 정렬 후 가운데 값 4가 평균이라는 친구 주장에 반응하고, 높이와 확신도를 입력합니다. 25개 블록을 고른 뒤, 평균이 6이면서 높이 6인 기둥은 없는 네 기둥을 만듭니다.
- **공통**: 입력 전 결과 비공개, 블록 이동이 끝나는 경계의 자동 정지, 시작 윤곽 유지, 세 선 비교, 무작위 장면 재구성과 해당 구간 재생, 응답 뒤 원리 표시, 변주, 생성 조건 검사, 동일 연출의 봉인 프레임.
- **반복**: 3D → 2D 막대 → 막대와 숫자 → 숫자와 식. 4회차부터 계산 두 문항. 학습 기록·복습일·확신도 비교는 로컬에 저장하며 JSON으로 내보낼 수 있습니다.
- **교실**: 모듈별 단독 실행, 반 전체 투표 후 진행. 개인 학습 회차·일정·변주 노출과 분리합니다.

E2 이후, 혼합 R 복습 세션, 전체 30일 커리큘럼 배정은 다음 범위입니다. 현재 E0·E1에 대한 복습 일정과 적응 규칙만 동작합니다.

## 개발 및 검증

```sh
npm ci
npm test
npm run build
npm run verify
```

- Three.js + GSAP 3, 별도 서버 코드 없음.
- 실제 GLB 파싱과 Three 장면, 실제 GSAP 타임라인을 쓰는 비렌더링 상호작용 테스트 포함.
- Blender **4.5.14 LTS** 원본, 1080p·30fps·5초 MP4 두 개, 로컬 한국어 TTS 24개 포함.
- 자세한 범위·설계 판단·시간 예산·검수 한계: [`deliverables/docs/implementation.md`](deliverables/docs/implementation.md).
- 모듈: [`module_list.md`](deliverables/docs/module_list.md), 로그: [`log_schema.md`](deliverables/docs/log_schema.md).

## 다음 리비전

작업 지시서를 수정해 커밋한 뒤 변경할 에피소드나 범위를 요청하세요. `versions/v0`과 `v0` 태그는 수정하지 않습니다. 구현은 `deliverables/web`, 에셋은 `deliverables/assets`, 대본은 `deliverables/scripts`를 기준으로 갱신합니다. `AGENTS.md`에 같은 절차를 기록했습니다.
