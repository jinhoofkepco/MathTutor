# E0·E1 모듈

모듈은 `episode + phase`로 분리되어 있으며, 진입 시 이전 타임라인·음성·장면을 정리합니다. 교실 선택 화면은 모든 모듈의 독립 실행 진입점입니다.

독립 실행 예:
`web/index.html?classroom=1&episode=E1&module=E1-predict`

개인 모드에서 결과 모듈의 주소를 직접 열면 해당 에피소드의 첫 게이트로 들어갑니다. 교실 모드에서만 임의 모듈로 진입할 수 있습니다. 예측이 없는 독립 비교 실행에는 가짜 학습자 예측선을 만들지 않습니다.

| E0 ID | 동작 |
|---|---|
| E0-intro | 친구 없이 두 팀 제시, 비교 방법 직접 입력 |
| E0-method | 입력한 방법을 남기고 인원·총합 비교 |
| E0-predict | A/B 예상 높이와 확신도 입력 |
| E0-develop | A/B 블록을 차례로 고르기, 단위 이동 완료 시 정지 |
| E0-compare | 예상과 실제 비교 |
| E0-reconstruct | 두 팀의 핵심 장면 네 컷 재구성 |
| E0-question | 변하지 않은 것 입력 뒤 원리 표시 |
| E0-variation | 다른 두 팀으로 예측부터 한 번 반복 |
| E0-generate | 4명, 총합32인 자료 생성 |
| E0-seal | 4×8=32 공통 봉인 연출 |

| E1 ID | 동작 |
|---|---|
| E1-friend | 친구 주장에 동의/반대/모르겠다 |
| E1-predict | 연속 예상 높이·확신도 입력 |
| E1-develop | 넘친 단위를 부족한 곳으로 옮기기 |
| E1-compare | 예상 ◇ / 친구 ▱ / 실제 ● 비교 |
| E1-reconstruct | 핵심 네 장면 순서와 해당 구간 재생 |
| E1-question | 관찰 입력 뒤 발견 원리 표시 |
| E1-variation | 다섯 값, 여섯 값으로 각각 한 번 반복 |
| E1-generate | 4개, 합24, 어느 값도6이 아닌 자료 생성 |
| E1-seal | 4×6=24 공통 봉인 연출 |

`E0-calculate`, `E1-calculate`는 개인 4회차 이후 봉인 다음에 붙는 계산 모듈입니다. 각 두 문항을 입력한 뒤 입력과 계산식을 나란히 보여 줍니다. 변주는 `round` 로그 필드로 구별하며 기존 friend/predict/develop/compare 모듈을 재사용합니다.
