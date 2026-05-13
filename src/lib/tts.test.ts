import { describe, it, expect } from "vitest";
import { ttsAvailable, speak } from "./tts";

describe("tts", () => {
  it("ttsAvailable returns a boolean", () => {
    expect(typeof ttsAvailable()).toBe("boolean");
  });

  it("speak does not throw when unavailable", () => {
    expect(() => speak("Hallo", null)).not.toThrow();
  });
});
