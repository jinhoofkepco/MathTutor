import manifest from "../../assets/audio/manifest.json";
export class Narrator {
  constructor(caption, status, settings) {
    this.caption = caption;
    this.status = status;
    this.settings = settings;
    this.audio = new Audio();
    this.audio.preload = "auto";
    this.current = null;
    this.audio.onended = () => {
      this.caption.hidden = true;
    };
  }
  play(id) {
    const item = manifest.find((x) => x.id === id);
    if (!item) return;
    this.current = id;
    this.audio.pause();
    this.audio.src = "../assets/audio/" + item.file;
    this.caption.textContent = item.text;
    this.caption.hidden = !this.settings.captions;
    this.status.textContent = "";
    if (this.settings.muted) {
      return;
    }
    this.audio.play().catch(() => {
      this.status.textContent = "◖)) 버튼으로 음성을 들어 보세요.";
    });
  }
  stop() {
    this.audio.pause();
    this.caption.hidden = true;
    this.status.textContent = "";
  }
  repeat() {
    if (this.current) this.play(this.current);
  }
}
