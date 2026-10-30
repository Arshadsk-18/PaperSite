// ==============================================================================
// PaperSite: Notification Chime Helper
// File: src/lib/chime.ts
// Plays a soft notification chime on new booking arrival, honoring browser audio policies.
// ==============================================================================

let audioContext: AudioContext | null = null;
let userHasInteracted = false;

// Register user interaction to unlock audio playback
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    userHasInteracted = true;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
}

export function playNotificationChime(muted: boolean = false): void {
  if (muted || !userHasInteracted || typeof window === 'undefined') {
    return;
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioContext) {
      audioContext = new AudioCtx();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Soft warm bell tone (two pleasant chord notes)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05); // Soft volume
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6); // Gentle decay

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  } catch (err) {
    console.warn('[PaperSite] Unable to play chime:', err);
  }
}
