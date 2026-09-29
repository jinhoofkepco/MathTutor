# 로컬 학습 로그

저장 키: `MathTutor.v1`. 학습자 ID는 브라우저에서 무작위 생성하며 이름·이메일·서버 전송은 없습니다. 설정의 기록 내보내기로 `{schema, learner_id, events}` JSON을 받습니다. 저장소가 지워지면 회차와 일정도 초기화됩니다.

모든 이벤트는 원문 스키마의 필드를 가집니다. 해당하지 않는 값은 `null`입니다. 세션 혼입 방지를 위해 `session_id`, 교실 분리를 위해 `classroom`, 변주 구분을 위해 `round`를 추가했습니다.

```json
{
  "learner_id": "local-random-id",
  "session_id": "new-id-per-episode-start",
  "episode": "E1",
  "module": "E1-predict",
  "repetition": 1,
  "abstraction_stage": 1,
  "event": "predict",
  "friend_response": "disagree",
  "prediction_value": 5.2,
  "actual_value": 5,
  "confidence": 3,
  "response_time_ms": 4200,
  "reconstruct_attempts": 0,
  "classroom": false,
  "round": 0,
  "timestamp": "2026-09-29T00:00:00.000Z"
}
```

추가 이벤트: `module_enter`, `method`, `friend_response`, `class_vote`, `class_prediction`, `auto_pause`, `segment_end`, `rewind`, `reconstruct`, `replay_segment`, `insight`, `principle_revealed`, `generate`, `generate_complete`, `rapid_response_reflection`, `seal_complete`, `calculate`, `episode_complete` 등입니다. 각 종류는 `values`, `text`, `progress`, `from/to`, `order` 같은 필요한 필드를 추가합니다. 내부 조건 검사 값은 UI의 판정 문구로 사용하지 않습니다.

적응 집계는 현재 `session_id`의 유효한 개인 `predict`만 사용합니다. 중단한 실행의 예측은 새 실행에 섞지 않습니다. 완료는 멱등적이며 교실 완료는 개인 회차를 올리지 않습니다. 3개 개인 에피소드 완료마다 유효한 확신도 1~2 / 3~4 그룹의 예측 근접도 두 막대를 표시합니다. 근접도는 `1/(1+절대오차)`의 평균이며 점수·등급으로 표시하지 않습니다.
