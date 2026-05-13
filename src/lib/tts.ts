export function ttsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function listGermanVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("de"));
}

export function speak(text: string, voiceURI: string | null): void {
  if (!ttsAvailable()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  if (voiceURI) {
    const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
    if (voice) u.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
