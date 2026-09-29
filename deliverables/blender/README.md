# E0·E1 공통 Blender 에셋과 봉인 영상 — v1

`mean_concept_video_work_order.md`의 고정 시각 문법을 사용한 새 독립 에셋입니다. 사이트·GitHub 파일 및 기존 Blender 작업은 변경하지 않았습니다.

## 제작 버전

**Blender 4.5.14 LTS**, macOS arm64, build hash `62c1db4208e8`, 2026-09-15 빌드에서 실제 모델링·내보내기·저장·렌더링했습니다. 공식 `download.blender.org/release/Blender4.5/` DMG를 작업 폴더에 다운로드하고 공식 SHA-256과 일치함을 확인한 후 읽기 전용으로 마운트하여 실행했습니다. 시스템 Blender 앱은 변경하지 않았습니다.

## 전달 파일

- `mean-common-v1.glb` — 웹용 공통 에셋. 5개 최상위 node.
- `mean-common-v1.blend` — 공통 에셋, 기존 추상 봉인 및 아래 E0/E1 수량별 native scene.
- **`seal-E0.mp4`** — 처음부터 8개씩 4기둥, **4×8=32**를 보존하여 노란 직사각형으로 합침.
- **`seal-E1.mp4`** — 처음부터 6개씩 4기둥, **4×6=24**를 보존하여 노란 직사각형으로 합침.
- 두 에피소드 영상은 동일한 1920×1080, 30fps, 150프레임, 5초, H.264/yuv420p, 무음입니다.
- `seal.mp4` — 기존 4×3 추상 시연만 보존. **E0/E1의 수량 overlay와 함께 사용하지 않습니다.**
- `build_v1_assets.py` — 재생성용 Blender Python. `ROOT`가 출력 폴더입니다.
- `add_episode_seals.py` — E0/E1에 같은 `make_episode_seal(episode,height)` 함수를 적용합니다. 위 생성 스크립트 마지막에서 자동 호출됩니다.
- `render_episode_seals.py` — E0/E1 두 scene을 각각 150프레임 렌더링합니다.
- `assetmetadata.json` — 정확한 색·투명도·node 규격 및 제작 이력.
- `native-validation.json` — 저장한 원본을 새 Blender 프로세스에서 열어 검증한 결과.
- `video-validation.json` — 완성 MP4의 ffprobe 검사 결과.
- `episode-seal-validation.json` — 새 E0/E1 scene 좌표·단위수·공통 카메라 검증.
- `episode-video-validation.json` — 새 E0/E1 MP4의 ffprobe 결과.

`frames/`, `qa/`, 공식 DMG 및 마운트 폴더는 제작·검수용 중간 자료입니다.

## GLB node 규격

좌표계는 **glTF Y-up, 전면 +Z**입니다. Blender `(x,y,z)`는 glTF `(x,z,-y)`로 변환됩니다. 모든 수치는 가상 공간의 단위 길이이며 `UnitCube` 하나가 자료의 1단위입니다.

| 최상위 node | 종류 | 로컬 치수 XYZ | 색·투명도 |
|---|---|---|---|
| `UnitCube` | 단일 Mesh, 단일 primitive | **1 × 1 × 1** | `#5B7A99`, opaque; bevel .035 |
| `AveragePlane` | 단일 Mesh, 수평 XZ 면 | 1 × 0 × 1 | `#E04A3F`, alpha .45, BLEND |
| `TotalPlane` | 단일 Mesh, 수직 XY 면 | 1 × 1 × 0 | `#F5D04C`, alpha .50, BLEND |
| `FriendNeutral` | 최상위 Group, 자식 mesh | .744 × 1.66 × .348502 | 차분한 초록색 옷, neutral 표정 |
| `FriendSurprised` | 최상위 Group, 자식 mesh | .744 × 1.66 × .348502 | 같은 친구, 눈·눈썹·입만 surprised 표정 |

UnitCube 및 두 plane의 원점은 로컬 기하 중심입니다. 친구 두 group의 원점도 합성 bounding box의 중심이며, 정지한 같은 또래 캐릭터의 두 표정입니다. 친구의 주장 색을 맞출 때는 extras `claimColor: #778872`를 쓸 수 있습니다. 캐릭터 자체의 애니메이션은 없습니다. E0에서는 캐릭터를 표시하지 않습니다.

GLB에는 library 전시용 위치가 있습니다. `gltf.scene.getObjectByName(name)`으로 추출한 뒤 clone의 `position.set(0,0,0)`으로 위치를 초기화하고 장면에 배치하세요. 친구는 Group 전체를 clone합니다. 표정 변경은 두 Group의 visible 전환으로 충분합니다.

색은 명세의 sRGB hex를 Blender의 linear RGB 입력으로 정확히 변환했습니다. JSON의 glTF `baseColorFactor`는 linear 값이므로 hex의 0–255 값과 직접 비교하지 않습니다. Three.js에서 색을 재지정할 때는 `material.color.set('#5B7A99')`처럼 hex를 사용하세요.

AveragePlane과 TotalPlane은 실제 GLB에서 `alphaMode=BLEND`, `doubleSided=true` 및 요청한 alpha를 확인했습니다. 웹에서는 `depthWrite=false`를 권장합니다. 수평 평균면은 `scale.set(가로길이,1,깊이)`로, 총합 직사각형은 `scale.set(개수,평균,1)`로 사용합니다.

## E0/E1의 수량이 일치하는 공통 봉인 연출

웹에서 학습자의 자료를 먼저 실제 목표 평균으로 고릅니다. 봉인 영상은 그 결과에 맞는 **평평한 네 기둥**에서 시작합니다. E0는 높이 8, 총 32개 단위이며 E1은 높이 6, 총 24개 단위입니다. 같은 함수에서 높이만 매개변수로 바꾸고 타이밍, 카메라 위치·배율, 조명, 재질, 전환 방식을 모두 공유합니다.

- native scene: `Shared_Seal_E0_5s_1080p30`, `Shared_Seal_E1_5s_1080p30`.
- frame 1–40: 이미 고른 네 기둥을 유지합니다.
- frame 41–100: 단위 높이를 유지하며 기둥 사이 간격만 닫습니다.
- frame 101–124: 같은 외형의 노란 직사각형으로 전환합니다.
- frame 125–150: 최종 직사각형을 유지합니다.
- E0/E1의 블록은 모든 프레임에서 각각 32개/24개입니다. 각각의 z 중심은 .5부터 7.5까지, .5부터 5.5까지 고정됩니다.
- 최종 가로는 둘 다 4, 세로는 각각 8/6입니다. Rectangle alpha는 .5입니다.

두 카메라의 Blender 위치 `(0,-24,4)`, 목표 `(0,0,4)`, 정사영 scale 18이 정확히 같습니다. 영상 해상도에서 단위 1칸은 106.6667px이며 baseline은 y=966.6667px입니다. 최종 직사각형의 x 범위는 둘 다 746.6667–1173.3333px, E0의 y 범위는 113.3333–966.6667px, E1은 326.6667–966.6667px입니다. 따라서 숫자가 다른데 같은 크기의 그림이 나오는 수량 불일치가 없습니다.

웹은 E0에 `seal-E0.mp4`, E1에 `seal-E1.mp4`를 선택합니다. 기존 `seal.mp4`는 이 두 수량에 사용하지 않습니다. 문자열·숫자는 여전히 웹 overlay에서만 표시합니다.

## 기존 5초 추상 봉인 시연

기존 `seal.mp4`는 4×3 구조의 추상 시연으로만 남겨 두었습니다. 글자, 숫자, 친구, 배경 장식, 효과음, 음악은 없습니다. E0/E1에서는 위 수량별 파일을 사용합니다.

- frame 1–19: 같은 청회색 네 기둥, 높이 2·4·2·4, 12개 단위.
- frame 20–74: 높은 두 기둥에서 낮은 두 기둥으로 각각 한 블록을 이동하여 3·3·3·3으로 고릅니다.
- frame 75–85: 고른 높이를 잠깐 유지합니다.
- frame 86–111: 기둥 사이 간격만 닫습니다.
- frame 112–129: 블록 분할이 사라지고 동일한 4×3 노란 직사각형으로 전환합니다.
- frame 130–150: 반투명 노란 직사각형을 유지합니다.

카메라는 고정 정사영 정면입니다. 흰회색 배경 위에 모델만 있습니다. 자료 단위 12개가 모든 프레임에서 유지되고, 마지막 직사각형은 너비 4·높이 3입니다. 숫자는 영상에 출력하지 않습니다. 이 전환은 개념 전달용으로 직접 keyframe을 만든 애니메이션이며, rigid-body 시뮬레이션이라고 주장하지 않습니다.

## 재생성 및 검증

Blender 4.5.14에서 `--background --factory-startup --python build_v1_assets.py`로 source와 GLB 및 E0/E1 봉인 scene을 생성합니다. 저장된 `.blend`의 active scene은 E0 봉인 장면입니다. `render_episode_seals.py`를 실행하면 E0/E1 모두 각각 `frames-E0`, `frames-E1`에 150프레임을 렌더링합니다. 이후 ffmpeg로 30fps H.264/yuv420p MP4를 만들고 `-movflags +faststart`로 웹 재생에 맞춥니다.

UnitCube 실제 GLB bounds가 각 축 [-.5,.5]인지, 최상위 node 이름, plane alpha, 4.x 원본 재오픈, 고르기 후 좌표, 마지막 alpha를 자동 검사합니다. 봉인 시작·고른 상태·최종 상태와 친구 두 표정을 렌더링해 시각 검수했습니다. 완성 MP4는 해상도, 프레임레이트, 프레임수, 길이, 오디오 부재를 ffprobe로 확인합니다.
