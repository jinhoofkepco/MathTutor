# 평균 물리 실험실 — Blender v4 asset kit

새로운 격리된 Blender 5.2.0 LTS headless 프로세스에서 만들었습니다. 기존 Blender 장면과 v1 파일은 변경하지 않았습니다.

## 파일

- `mean-physics-kit-v4.glb` — 114,928 bytes. 7개의 평탄한 최상위 노드, 각 노드는 단일 mesh 및 단일 primitive/material입니다.
- `mean-physics-lab-v4.blend` — 189,451 bytes. 원본 asset library 및 실제 native rigid-body 데모, 내장 bake cache.
- `asset-specifications-v4.json` — 정확한 치수, glTF extras, 투명도 검증, 실제 물리 시뮬레이션 trace.
- `build_assets_v4.py` — 재생성 스크립트. `ROOT`를 원하는 작업 폴더로 설정하여 Blender headless에서 실행합니다.

## 좌표와 치수

단위는 m 및 kg입니다. GLB는 Y-up, 전면은 +Z입니다. Blender `(x,y,z)`는 glTF `(x,z,-y)`로 변환됩니다. 모든 scale과 rotation은 적용되어 있고, 각 mesh의 로컬 bounding-box 중심은 정확히 `(0,0,0)`입니다. 원본 kit의 전시 배치를 무시하려면 clone 후 `position.set(0,0,0)`으로 초기화하세요.

| 정확한 노드 이름 | GLB 외형 XYZ | 주요 세부 사항 |
|---|---|---|
| `Crate` | .64 × .40 × .48 | 전면 +Z의 얕은 세로·가로 rib를 하나의 mesh로 합침. 무광 white. stacking step .40. |
| `Ball` | .50 × .50 × .50 | 반지름 .25. single sphere mesh, mass 1. stacking step .50. |
| `Tube` | .54 × 4 × .54 | 내경 .510, 외경 .540, 벽 두께 .015. 위·아래 열림. inner/outer wall 및 양 끝 annular ring이 하나의 mesh. |
| `Tank` | .752 × 4.016 × .492 | 내부 .72 × 4 × .46, 벽/바닥 두께 .016. 위 열림, 바닥 있음. |
| `Rod` | .52 × 1 × .28 | bevel .015, white. `scale.y`로 높이 조정. |
| `Pedestal` | .84 × .14 × .72 | 하나의 얕은 slot. slot 내부 .68 × .03 × .54. slot 바닥 local Y=.04. |
| `Valve` | .327266 × .327266 × .1825 | 하나의 brass mesh, 8개 scallop grip와 stem. 축은 Z, 전면 +Z. |

`Tube`와 `Rod`의 높이는 `scale.y`로 조정할 수 있습니다. 중심 origin이므로 원하는 bottom 높이를 B로 두면 `position.y = B + 원본높이 * scale.y / 2`로 배치합니다. `Tank` 내부 바닥은 local Y=-1.992, 내부 상단은 Y=2.008입니다. 전체 외형 중앙이 origin이므로 내부 높이 중앙과 .008m 차이가 있습니다.

`Pedestal`은 하나의 slot을 뜻하며 노드 이름은 `Pedestal`입니다. extras의 `slotCount`는 1입니다. `Crate` 깊이 .48은 `Tank` 내부 깊이 .46보다 큽니다. native 상자 데모는 상자에 맞춘 별도의 .68 × .52 내부 가이드를 사용합니다.

## 재질과 Three.js 사용

- `Crate`, `Ball`, `Rod`, `Pedestal`: 같은 white source material. 서로 다른 색을 적용할 때 각 clone의 material도 clone하세요.
- `Tube`, `Tank`: glTF `alphaMode: BLEND`, `doubleSided: true`, `baseColorFactor.a: 0.1199999973`를 실제 출력 파일에서 확인했습니다. roughness .18, metallic 0. 웹에서는 `transparent=true`, `opacity=.12`, `depthWrite=false`, `side=THREE.DoubleSide`를 권장합니다. 빛 굴절 텍스처 의존성은 없습니다.
- `Valve`: brass, metallic .65, roughness .33. 웹 재지정 가능.

모든 named node는 `GLTFLoader`에서 바로 Mesh로 읽히므로 `gltf.scene.getObjectByName(name).clone()`으로 추출할 수 있습니다. kit의 7개 mesh 각각은 하나의 material만 쓰며 부모 Group이나 복수 primitive로 분리되지 않습니다.

`mass`, `friction`, `restitution`, `collider`, `rigidBodyType`, `gltfDimensions`는 glTF extras에 보존되어 `mesh.userData`로 읽을 수 있습니다. 추가로 Tube의 `innerDiameter`, `outerDiameter`, Tank의 `innerDimensions`, Pedestal의 `slotCount`, Ball의 `radius` 등도 포함합니다.

glTF는 물리 엔진을 실행하지 않습니다. 브라우저에서 Cannon body/shape를 별도로 구성해야 합니다. 열린 Tube와 Tank를 단일 convex collider로 처리하면 빈 내부가 막힙니다. Tube의 내부 벽은 원형으로 배치한 얇은 정적 wall collider, Tank는 4개 벽과 바닥의 정적 box collider로 구성할 수 있습니다.

## 실제 Blender 물리 검증

`V4_Guided_Drop_Demonstration`에는 .25m 반지름의 구슬 4개, 상자 3개, 원통 가이드와 사각 가이드, 바닥이 있습니다. 7개 물체는 각각 1kg이며 Blender native Bullet rigid body입니다.

- 60fps, frame 1–180, gravity -9.81m/s², 12 substeps/frame, 100 solver iterations.
- 구슬 시작 center Z: .60, 1.29, 1.98, 2.67m. 마지막 center Z: .250000, .749912, 1.249823, 1.749733m.
- 상자 시작 center Z: .55, 1.25, 1.95m. 마지막 center Z: .20, .60, 1.00m.
- 7개 모두 중력으로 낙하하여 가이드 안에 쌓인 것을 검증했습니다. 좌우로 약간 움직일 수 있는 구슬의 실제 접촉 간격 때문에 높이는 정확한 .5m 배수에서 조금 다릅니다.
- bake cache를 `.blend`에 저장한 뒤 별도 Blender 프로세스에서 다시 열어 frame 1, 60, 180의 위치와 `is_baked=True`를 확인했습니다. 키프레임으로 모사한 움직임이 아닙니다.

다른 native scene `V4_Asset_Library`에서 7개의 원본 모델을 편집할 수 있습니다.
