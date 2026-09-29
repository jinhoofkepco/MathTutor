#!/usr/bin/env python3
"""Generate offline Korean narration; no network services are used."""
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent / "work" / "generated-audio"
VOICE = "Yuna"
RATE = 170
CLIPS = [
    ("E0-intro", "어느 팀이 더 잘했을까? 공평하게 비교할 방법을 정해 봐."),
    ("E0-method", "네 방법을 기억해 두자. 인원수도 함께 살펴볼까?"),
    ("E0-predict", "각 팀의 점수를 한 사람씩 똑같이 나누면, 어느 높이가 될까?"),
    ("E0-develop", "한 사람당 몫을 맞추는 방법도 살펴보자."),
    ("E0-question", "고르기 전과 후에 그대로 남은 것은 무엇일까?"),
    ("E0-discover", "팀 안에서 옮기기만 했으니, 총합은 그대로야. 같은 몫으로 두 팀을 비교할 수도 있어."),
    ("E0-generate", "네 명인 팀을 만들어 봐. 에이 팀과 한 사람당 몫이 같아야 해."),
    ("E1-friend", "작은 것부터 세우면 가운데가 사야. 그러니까 평균도 사야."),
    ("E1-predict", "네 생각은 어때? 높이를 정하고, 얼마나 확신하는지도 알려 줘."),
    ("E1-develop", "넘치는 곳에서 빈자리로 옮겨 보자."),
    ("E1-compare", "네 예상과 친구의 표시를 다시 살펴봐."),
    ("E1-question", "처음에는 없었는데, 고르고 나니 생긴 높이가 있니?"),
    ("E1-discover", "평균은 처음 자료 속에 없는 값일 수도 있어."),
    ("E1-generate", "기둥 네 개의 평균을 육으로 만들어 봐. 단, 높이가 육인 기둥은 하나도 없게."),
    ("common-reconstruct", "방금 본 장면을 순서대로 놓아 봐."),
    ("common-bypass", "어떻게 그렇게 빨리 알았어? 이유 좀 알려 줘."),
    ("common-seal", "개수 곱하기 평균은 총합."),
    ("variation1-false", "이번 평균은 가장 작은 값과 가장 큰 값의 중간이야. 오 점 오라고 생각해."),
    ("variation1-true", "이번 평균은 육이야."),
    ("variation2-false", "가장 큰 값과 작은 값의 중간이 평균이지. 사 점 오야."),
    ("variation2-true", "이번 평균은 사이야."),
    ("common-generate-retry", "네가 만든 모습과 목표 높이를 나란히 살펴봐."),
    ("common-vote", "반 전체의 생각을 모은 뒤에 이어가자."),
    ("common-replay", "이 두 장면 사이만 다시 살펴보자."),
]

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)

def scripts(rows):
    by_id = {row["id"]: row for row in rows}
    common = [key for key, _ in CLIPS if key.startswith("common-")]
    for episode, title in [("E0", "발명"), ("E1", "고르기")]:
        body = [
            f"# {episode} — {title}: 한국어 내레이션 대본",
            "",
            "- 음성: macOS 로컬 `say`, Yuna (`ko_KR`), 속도 170.",
            "- 형식: MP3, 44.1 kHz, 모노, 128 kbps. 배경음악·효과음 없음.",
            "- 재생 시간: 완성한 MP3 파일을 `ffprobe`로 측정한 초 단위 값.",
            "- 자막: `manifest.json`의 `text`를 사용하되 접근성 설정의 기본값은 끔.",
            "- 게이트의 응답·예측 입력 전에 전개나 발견 대사를 재생하지 않음.",
            "- 아래 대사 외의 제작 메모, ID, 재생 시간은 내레이션하지 않음.",
            "",
        ]
        if episode == "E1":
            body += [
                "친구의 주장은 발견을 유도하기 위한 주장이다. 본편 자료는 [4, 7, 3, 8, 3]이며, 정렬한 자료의 가운데 값 4와 평균 5를 구분한다. 변주 1은 [2, 5, 8, 9, 6] (평균 6), 변주 2는 [1, 2, 3, 4, 6, 8] (평균 4)이다. 각 변주의 두 음성은 대체 주장으로 준비했으며 연속해서 모두 재생하지 않는다.",
                "",
            ]
        body += ["## 본편", ""]
        groups = [[key for key, _ in CLIPS if key.startswith(episode + "-")]]
        if episode == "E1":
            groups.append([key for key, _ in CLIPS if key.startswith("variation")])
        groups.append(common)
        for index, keys in enumerate(groups):
            if index:
                body += ["## " + ("변주 대체 주장" if episode == "E1" and index == 1 else "공통·분기 음성"), ""]
            for key in keys:
                row = by_id[key]
                body += [f"### {key}", "", f"파일: `{row['file']}` · 실제 길이: {row['duration']:.3f}초", "", row["text"], ""]
        (ROOT / f"{episode}.md").write_text("\n".join(body), encoding="utf-8")

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    manifest = []
    with tempfile.TemporaryDirectory(prefix=".speech-", dir=ROOT) as scratch:
        scratch = Path(scratch)
        for clip_id, text in CLIPS:
            source = scratch / f"{clip_id}.aiff"
            text_file = scratch / f"{clip_id}.txt"
            text_file.write_text(text, encoding="utf-8")
            target = ROOT / f"{clip_id}.mp3"
            run(["say", "-v", VOICE, "-r", str(RATE), "-f", str(text_file), "-o", str(source)])
            run([
                "/opt/homebrew/bin/ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(source), "-af", "highpass=f=60,loudnorm=I=-18:TP=-2:LRA=7",
                "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k",
                "-metadata", f"title={clip_id}", "-metadata", "language=kor", str(target),
            ])
            result = json.loads(run([
                "/opt/homebrew/bin/ffprobe", "-v", "error", "-show_entries",
                "format=duration:stream=codec_name,sample_rate,channels", "-of", "json", str(target)
            ]).stdout)
            duration = float(result["format"]["duration"])
            stream = result["streams"][0]
            assert duration > 0 and stream["codec_name"] == "mp3"
            assert stream["channels"] == 1 and stream["sample_rate"] == "44100"
            run(["/opt/homebrew/bin/ffmpeg", "-v", "error", "-i", str(target), "-f", "null", "-"])
            row = {"id": clip_id, "text": text, "file": target.name, "duration": round(duration, 6)}
            manifest.append(row)
            print(f"{clip_id}: {duration:.3f}s", flush=True)
    (ROOT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    scripts(manifest)
    print(f"COMPLETE: {len(manifest)} clips, {sum(row['duration'] for row in manifest):.3f}s total", flush=True)

if __name__ == "__main__":
    main()
