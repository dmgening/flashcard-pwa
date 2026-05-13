import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ZodError } from "zod";
import { getSettings, type SettingsRow } from "@/db/dexie";
import { exportAll, importAll } from "@/db/export-import";
import { listGermanVoices, ttsAvailable } from "@/lib/tts";
import { useSettingsStore } from "@/store/settings-store";

export function SettingsRoute() {
  const [s, setS] = useState<SettingsRow | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSettings().then(setS);
    if (ttsAvailable()) {
      const refresh = () => setVoices(listGermanVoices());
      refresh();
      window.speechSynthesis.addEventListener("voiceschanged", refresh);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
    }
  }, []);

  const storeUpdate = useSettingsStore((st) => st.update);

  async function update(patch: Partial<Omit<SettingsRow, "id">>) {
    await storeUpdate(patch);
    setS(await getSettings());
  }

  async function doExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashcard-pwa-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(mode: "merge" | "replace") {
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg("Choose a file first."); return; }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAll(parsed, mode);
      setMsg(`Imported (${mode}).`);
      setS(await getSettings());
      // Clear the input so re-clicking import doesn't silently re-apply the same file.
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      if (e instanceof ZodError) {
        setMsg("Import failed: file is not a valid flashcard export.");
      } else if (e instanceof SyntaxError) {
        setMsg("Import failed: file is not valid JSON.");
      } else {
        setMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (!s) return <div className="p-4 text-neutral-500">Loading…</div>;

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <Link to="/decks" className="text-neutral-400 text-sm">←</Link>
        <h2 className="text-xl font-semibold">Settings</h2>
        <span className="w-4" />
      </header>

      <section className="space-y-2">
        <label className="text-sm font-semibold">TTS voice (German)</label>
        {ttsAvailable() ? (
          <select
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            value={s.ttsVoiceURI ?? ""}
            onChange={(e) => update({ ttsVoiceURI: e.target.value || null })}>
            <option value="">Default</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
          </select>
        ) : <div className="text-sm text-neutral-500">Web Speech unavailable.</div>}
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.soundOn} onChange={(e) => update({ soundOn: e.target.checked })} />
          Sound on
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Backup</h3>
        <button onClick={doExport} className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">Export JSON</button>
        <input ref={fileRef} type="file" accept="application/json" className="block w-full text-sm" />
        <div className="flex gap-2">
          <button onClick={() => doImport("merge")} className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">Import (merge)</button>
          <button onClick={() => doImport("replace")} className="flex-1 rounded-lg border border-rose-900 text-rose-300 px-3 py-2 text-sm">Import (replace)</button>
        </div>
        <div className="text-[10px] text-neutral-500">Merge sums stats; settings are always overwritten by the import.</div>
        {msg && <div className="text-xs text-neutral-400">{msg}</div>}
      </section>
    </div>
  );
}
