import type { MusicScene, MusicTransport, SoundKind } from "../platform/Host";
import { MUSIC_CATALOG, musicCatalogEntry, musicTrackForScene } from "./musicCatalog";
import type { MusicTrackId } from "./musicCatalog";

interface ToneLayer {
  type: OscillatorType;
  frequency: number;
  endFrequency?: number;
  offset?: number;
  duration: number;
  gain: number;
  attack?: number;
  detune?: number;
}

interface MusicPattern {
  bpm: number;
  stepBeats: number;
  lead: ReadonlyArray<number | null>;
  bass: ReadonlyArray<number | null>;
  leadType: OscillatorType;
  volume: number;
}

const midiFrequency = (note: number): number => 440 * 2 ** ((note - 69) / 12);

export type MusicTrack = MusicTrackId;
// Both supplied MP3s carry gapless timing data, so browsers expose their
// authored beginnings at sample zero.
export const RECORDED_MUSIC_LOOP_STARTS: Record<MusicTrack, number> = Object.fromEntries(
  MUSIC_CATALOG.map((entry) => [entry.id, entry.loopStartSeconds]),
) as Record<MusicTrack, number>;
export const RECORDED_MUSIC_LOOP_DURATIONS: Record<MusicTrack, number> = Object.fromEntries(
  MUSIC_CATALOG.map((entry) => [entry.id, entry.loopEndSeconds - entry.loopStartSeconds]),
) as Record<MusicTrack, number>;

interface RecordedMusic {
  buffer: AudioBuffer;
  loopDuration: number;
}

export const SOUND_RECIPES: Record<Exclude<SoundKind, "timeover">, readonly ToneLayer[]> = {
  blocked: [
    { type: "sawtooth", frequency: 140, duration: 0.16, gain: 0.11 },
    { type: "square", frequency: 82, endFrequency: 62, duration: 0.11, gain: 0.035, offset: 0.012 },
  ],
  exit: [
    { type: "triangle", frequency: 520, endFrequency: 660, duration: 0.13, gain: 0.11 },
    { type: "sine", frequency: 780, endFrequency: 990, duration: 0.16, gain: 0.085, offset: 0.055 },
    { type: "sine", frequency: 1_170, endFrequency: 1_420, duration: 0.2, gain: 0.06, offset: 0.11 },
  ],
  ice: [
    { type: "sine", frequency: 1_180, endFrequency: 1_760, duration: 0.16, gain: 0.08 },
    { type: "triangle", frequency: 1_760, endFrequency: 1_320, duration: 0.2, gain: 0.045, offset: 0.035 },
    { type: "sine", frequency: 2_350, duration: 0.12, gain: 0.025, offset: 0.075 },
  ],
  thaw: [
    { type: "triangle", frequency: 1_720, endFrequency: 1_020, duration: 0.18, gain: 0.07 },
    { type: "sine", frequency: 2_340, endFrequency: 1_380, duration: 0.22, gain: 0.045, offset: 0.025 },
    { type: "square", frequency: 760, endFrequency: 520, duration: 0.12, gain: 0.018, offset: 0.04 },
  ],
  // Preserve the former peel fallback if the supplied waike recording cannot decode.
  // Its independent key keeps ice-contact and thaw recordings unchanged.
  shell: [
    { type: "sine", frequency: 1_180, endFrequency: 1_760, duration: 0.16, gain: 0.08 },
    { type: "triangle", frequency: 1_760, endFrequency: 1_320, duration: 0.2, gain: 0.045, offset: 0.035 },
    { type: "sine", frequency: 2_350, duration: 0.12, gain: 0.025, offset: 0.075 },
  ],
  win: [
    { type: "triangle", frequency: midiFrequency(72), duration: 0.3, gain: 0.1 },
    { type: "triangle", frequency: midiFrequency(76), duration: 0.3, gain: 0.1, offset: 0.09 },
    { type: "triangle", frequency: midiFrequency(79), duration: 0.32, gain: 0.1, offset: 0.18 },
    { type: "sine", frequency: midiFrequency(84), duration: 0.58, gain: 0.11, offset: 0.28 },
    { type: "sine", frequency: midiFrequency(91), duration: 0.7, gain: 0.035, offset: 0.31 },
  ],
  button: [
    { type: "sine", frequency: 620, endFrequency: 690, duration: 0.075, gain: 0.09 },
    { type: "triangle", frequency: 930, duration: 0.045, gain: 0.035, offset: 0.008 },
  ],
  putdown: [
    { type: "sine", frequency: 180, endFrequency: 120, duration: 0.11, gain: 0.08 },
    { type: "triangle", frequency: 420, endFrequency: 300, duration: 0.07, gain: 0.035, offset: 0.006 },
  ],
  fail: [
    { type: "triangle", frequency: midiFrequency(55), endFrequency: midiFrequency(51), duration: 0.3, gain: 0.105 },
    { type: "sawtooth", frequency: midiFrequency(48), endFrequency: midiFrequency(43), duration: 0.42, gain: 0.055, offset: 0.14 },
    { type: "sine", frequency: midiFrequency(36), duration: 0.55, gain: 0.06, offset: 0.25 },
  ],
  reward: [
    { type: "sine", frequency: midiFrequency(79), duration: 0.2, gain: 0.08 },
    { type: "sine", frequency: midiFrequency(84), duration: 0.25, gain: 0.085, offset: 0.09 },
    { type: "triangle", frequency: midiFrequency(88), duration: 0.38, gain: 0.075, offset: 0.19 },
  ],
  // Reward claims share the supplied gold recording; retain the generic reward decode fallback.
  gold: [
    { type: "sine", frequency: midiFrequency(79), duration: 0.2, gain: 0.08 },
    { type: "sine", frequency: midiFrequency(84), duration: 0.25, gain: 0.085, offset: 0.09 },
    { type: "triangle", frequency: midiFrequency(88), duration: 0.38, gain: 0.075, offset: 0.19 },
  ],
  // Each arriving reward particle gets its own short supplied recording.
  itemArrival: [
    { type: "sine", frequency: midiFrequency(84), duration: 0.1, gain: 0.05 },
    { type: "triangle", frequency: midiFrequency(88), duration: 0.14, gain: 0.035, offset: 0.025 },
  ],
  booster: [
    { type: "sawtooth", frequency: 180, endFrequency: 520, duration: 0.22, gain: 0.055 },
    { type: "triangle", frequency: 480, endFrequency: 1_040, duration: 0.28, gain: 0.08, offset: 0.025 },
    { type: "sine", frequency: 1_560, duration: 0.22, gain: 0.035, offset: 0.13 },
  ],
  unlock: [
    { type: "triangle", frequency: midiFrequency(67), duration: 0.22, gain: 0.085 },
    { type: "triangle", frequency: midiFrequency(72), duration: 0.26, gain: 0.085, offset: 0.1 },
    { type: "sine", frequency: midiFrequency(79), duration: 0.46, gain: 0.075, offset: 0.21 },
    { type: "sine", frequency: midiFrequency(91), duration: 0.55, gain: 0.025, offset: 0.24 },
  ],
  time: [
    { type: "triangle", frequency: 880, duration: 0.08, gain: 0.07 },
    { type: "triangle", frequency: 1_120, duration: 0.1, gain: 0.075, offset: 0.1 },
    { type: "sine", frequency: 1_540, endFrequency: 1_920, duration: 0.3, gain: 0.045, offset: 0.18 },
  ],
  rocket: [
    { type: "sawtooth", frequency: 95, endFrequency: 640, duration: 0.38, gain: 0.065 },
    { type: "triangle", frequency: 260, endFrequency: 1_180, duration: 0.42, gain: 0.075, offset: 0.025 },
    { type: "sine", frequency: 1_360, endFrequency: 2_220, duration: 0.32, gain: 0.035, offset: 0.12 },
  ],
  pulse: [
    { type: "sine", frequency: 120, endFrequency: 70, duration: 0.42, gain: 0.075 },
    { type: "triangle", frequency: 420, endFrequency: 1_180, duration: 0.38, gain: 0.065, offset: 0.035 },
    { type: "sine", frequency: 1_760, endFrequency: 1_210, duration: 0.34, gain: 0.04, offset: 0.13 },
  ],
  mechanic: [
    { type: "triangle", frequency: 320, endFrequency: 510, duration: 0.2, gain: 0.06 },
    { type: "sine", frequency: 780, endFrequency: 960, duration: 0.25, gain: 0.04, offset: 0.06 },
  ],
  // Dedicated supplied curtain recording; retain the generic recipe only as a decode fallback.
  shutter: [
    { type: "triangle", frequency: 320, endFrequency: 510, duration: 0.2, gain: 0.06 },
    { type: "sine", frequency: 780, endFrequency: 960, duration: 0.25, gain: 0.04, offset: 0.06 },
  ],
};

const SOUND_PLAYBACK_GAINS: Record<SoundKind, number> = {
  button: 0.58,
  putdown: 0.72,
  blocked: 0.68,
  ice: 0.68,
  thaw: 0.56,
  shell: 0.68,
  exit: 0.74,
  win: 0.8,
  fail: 0.74,
  reward: 0.76,
  gold: 0.76,
  // Match the supplied clip to button/putdown loudness, retaining headroom for five arrivals.
  itemArrival: 1.2,
  booster: 0.7,
  unlock: 0.78,
  time: 0.68,
  rocket: 0.78,
  pulse: 0.72,
  mechanic: 0.58,
  shutter: 0.58,
  timeover: 0.68,
};

export const MUSIC_PATTERNS: Record<Exclude<MusicScene, "silent">, MusicPattern> = {
  menu: {
    bpm: 78,
    stepBeats: 0.5,
    lead: [67, null, 71, 74, 69, null, 72, 76, 67, 71, 74, null, 69, 72, 74, 79],
    bass: [43, null, null, null, 45, null, null, null, 40, null, null, null, 45, null, null, null],
    leadType: "sine",
    volume: 0.28,
  },
  gameplay: {
    bpm: 104,
    stepBeats: 0.5,
    lead: [64, 67, null, 71, 67, 74, 71, null, 62, 67, 69, null, 66, 69, 74, 71],
    bass: [40, null, 40, null, 38, null, 38, null, 43, null, 43, null, 42, null, 42, null],
    leadType: "triangle",
    volume: 0.25,
  },
  danger: {
    bpm: 136,
    stepBeats: 0.5,
    lead: [69, null, 69, 72, 69, null, 76, 72, 68, null, 68, 71, 68, null, 75, 71],
    bass: [45, null, 45, null, 44, null, 44, null, 45, null, 45, null, 44, null, 44, null],
    leadType: "square",
    volume: 0.22,
  },
  victory: {
    bpm: 92,
    stepBeats: 0.5,
    lead: [72, 76, 79, 84, null, 79, 76, 79, 74, 77, 81, 86, null, 81, 77, 81],
    bass: [48, null, null, null, 45, null, null, null, 50, null, null, null, 43, null, null, null],
    leadType: "triangle",
    volume: 0.27,
  },
  defeat: {
    bpm: 64,
    stepBeats: 0.5,
    lead: [62, null, null, 59, null, null, 55, null, 60, null, null, 57, null, null, 52, null],
    bass: [38, null, null, null, null, null, null, null, 36, null, null, null, null, null, null, null],
    leadType: "sine",
    volume: 0.2,
  },
};

/**
 * Shared mixer for the original recorded soundtrack/effects. The oscillator
 * recipes remain as an immediate fallback while assets decode or on older
 * WeChat base libraries. A context is only supplied after a user gesture.
 */
export class ProceduralSoundscape {
  private readonly musicBus: GainNode;
  private readonly effectsBus: GainNode;
  private musicTimer?: ReturnType<typeof setTimeout>;
  private musicStep = 0;
  private scene: MusicScene = "silent";
  private enabled = false;
  private suspended = false;
  private selectedMusicTrack?: MusicTrack;
  /** Tracks selected by the player. The active track may move within this list
   * when a recorded source reaches its natural end. */
  private musicPlaylist: MusicTrack[] = [];
  private activeMusicTrack?: MusicTrack;
  private musicGeneration = 0;
  private musicEndTimer?: ReturnType<typeof setTimeout>;
  private readonly pendingMusic = new Set<MusicTrack>();
  private readonly musicBuffers: Partial<Record<MusicTrack, RecordedMusic>> = {};
  private musicSource?: AudioBufferSourceNode;
  private musicSourceTrack?: MusicTrack;
  private musicPosition = 0;
  private musicPositionStartedAt?: number;
  private musicPaused = false;
  private readonly soundBuffers: Partial<Record<SoundKind, AudioBuffer>> = {};
  private timeoverSound?: { source: AudioBufferSourceNode; level: GainNode };
  private readonly musicVoices = new Set<OscillatorNode>();

  constructor(private readonly context: AudioContext) {
    const master = context.createGain();
    this.musicBus = context.createGain();
    this.effectsBus = context.createGain();
    master.gain.value = 0.82;
    this.musicBus.gain.value = 0.0001;
    this.effectsBus.gain.value = 0.9;
    this.musicBus.connect(master);
    this.effectsBus.connect(master);
    master.connect(context.destination);
  }

  setMusic(scene: MusicScene, enabled: boolean, selectedTrack?: MusicTrack, playlist?: readonly MusicTrack[]): void {
    const changed = scene !== this.scene;
    const enabledChanged = enabled !== this.enabled;
    const trackChanged = selectedTrack !== this.selectedMusicTrack;
    const nextPlaylist = this.normalizePlaylist(playlist);
    const playlistChanged = !this.samePlaylist(nextPlaylist, this.musicPlaylist);
    const playlistModeChanged = (nextPlaylist.length > 1) !== (this.musicPlaylist.length > 1);
    const previousTrack = musicTrackForScene(this.scene, this.selectedMusicTrack);
    const nextTrack = musicTrackForScene(scene, selectedTrack);
    const previousActiveTrack = this.activeMusicTrack;
    if (!changed && !enabledChanged && !trackChanged && !playlistChanged) {
      if (!enabled || scene === "silent" || this.suspended || (nextTrack && this.pendingMusic.has(nextTrack))
        || this.musicSource || this.musicTimer !== undefined) return;
    }
    this.scene = scene;
    this.enabled = enabled;
    if (!enabled || scene === "silent") this.musicPaused = false;
    this.selectedMusicTrack = selectedTrack;
    this.musicPlaylist = nextPlaylist;
    const requestedTrack = this.playlistStartTrack(nextTrack);
    const activeStillValid = previousActiveTrack !== undefined
      && (this.musicPlaylist.length === 0 || this.musicPlaylist.includes(previousActiveTrack));
    const mustSwitchTrack = Boolean(
      (previousTrack && nextTrack && previousTrack !== nextTrack)
      || trackChanged
      || (changed && previousTrack !== nextTrack)
      || (playlistChanged && playlistModeChanged)
      || (playlistChanged && !activeStillValid),
    );
    if (mustSwitchTrack) {
      this.stopMusicSource();
      this.musicPosition = 0;
      this.musicPositionStartedAt = undefined;
      this.activeMusicTrack = requestedTrack;
    } else if (!this.activeMusicTrack) {
      this.activeMusicTrack = requestedTrack;
    }
    // Reconcile the requested track even while muted, hidden or paused. A
    // later resume otherwise sees an unchanged scene and restarts the old
    // active track left over from the menu.
    if (!enabled || scene === "silent" || this.suspended) {
      this.stopMusic();
      this.stopMusicSource();
      return;
    }
    if (this.musicPaused) return;
    if (mustSwitchTrack || changed || this.musicTimer === undefined || !this.musicSource) this.startMusic();
  }

  musicTransport(): MusicTransport {
    const track = this.activeMusicTrack ?? musicTrackForScene(this.scene, this.selectedMusicTrack);
    const duration = track ? (this.musicBuffers[track]?.loopDuration ?? RECORDED_MUSIC_LOOP_DURATIONS[track] ?? 0) : 0;
    const elapsed = this.musicPositionStartedAt === undefined || this.musicPaused
      ? 0 : Math.max(0, this.context.currentTime - this.musicPositionStartedAt);
    const position = duration > 0 ? (this.musicPosition + elapsed) % duration : this.musicPosition;
    return { track, positionSeconds: position, durationSeconds: duration, playing: Boolean(track && this.enabled && !this.suspended && !this.musicPaused) };
  }

  setMusicPaused(paused: boolean): void {
    if (paused === this.musicPaused) return;
    const state = this.musicTransport();
    this.musicPosition = state.positionSeconds;
    this.musicPaused = paused;
    if (paused) {
      this.stopMusic();
      // A source cannot be paused by WebAudio. Stop it and restart from the
      // saved transport position on resume so it cannot keep running muted.
      this.stopMusicSource();
    } else if (this.enabled && !this.suspended) {
      this.startMusic();
    }
  }

  seekMusic(positionSeconds: number): void {
    const state = this.musicTransport();
    this.musicPosition = state.durationSeconds > 0
      ? Math.min(state.durationSeconds, Math.max(0, Number(positionSeconds) || 0)) : 0;
    this.musicPositionStartedAt = undefined;
    if (state.playing) {
      this.stopMusic();
      this.stopMusicSource();
      this.startMusic();
    }
  }

  expectMusicBuffer(track: MusicTrack): void {
    this.pendingMusic.add(track);
    if (this.activeMusicTrack === track || musicTrackForScene(this.scene, this.selectedMusicTrack) === track) {
      this.stopMusic();
      this.stopMusicSource();
    }
  }

  setMusicBuffer(track: MusicTrack, buffer: AudioBuffer, loopDuration = RECORDED_MUSIC_LOOP_DURATIONS[track] ?? musicCatalogEntry(track).loopEndSeconds): void {
    this.pendingMusic.delete(track);
    this.musicBuffers[track] = { buffer, loopDuration };
    if (this.activeMusicTrack === track || musicTrackForScene(this.scene, this.selectedMusicTrack) === track) {
      if (this.musicSourceTrack === track) this.stopMusicSource();
      if (this.enabled && !this.suspended) {
        this.activeMusicTrack = track;
        this.startMusic();
      }
    }
  }

  useSynthMusicFallback(track: MusicTrack): void {
    this.pendingMusic.delete(track);
    if ((this.activeMusicTrack === track || musicTrackForScene(this.scene, this.selectedMusicTrack) === track)
      && this.enabled && !this.suspended) {
      this.stopMusicSource();
      this.activeMusicTrack = track;
      this.startMusic();
    }
  }

  releaseMusicBuffer(track: MusicTrack): void {
    this.pendingMusic.delete(track);
    if (this.musicSourceTrack === track) this.stopMusicSource();
    delete this.musicBuffers[track];
  }

  setSoundBuffer(kind: SoundKind, buffer: AudioBuffer): void {
    this.soundBuffers[kind] = buffer;
  }

  play(kind: SoundKind): void {
    if (this.suspended) return;
    if (kind === "timeover") this.stopSound(kind);
    this.resumeContext();
    const buffer = this.soundBuffers[kind];
    let recorded = false;
    if (buffer && typeof this.context.createBufferSource === "function") {
      let source: AudioBufferSourceNode | undefined;
      let level: GainNode | undefined;
      try {
        source = this.context.createBufferSource();
        level = this.context.createGain();
        const ownedSource = source;
        const ownedLevel = level;
        source.onended = () => this.releaseSoundSource(ownedSource, ownedLevel);
        if (kind === "timeover") {
          this.timeoverSound = { source, level };
        }
        source.buffer = buffer;
        level.gain.value = SOUND_PLAYBACK_GAINS[kind];
        // WeChat's AudioNode.connect() is void on some real-device base
        // libraries, unlike browsers which return the destination node.
        source.connect(level);
        level.connect(this.effectsBus);
        source.start(this.context.currentTime + 0.004);
        recorded = true;
      } catch {
        if (source) {
          try { source.stop(); } catch { /* playback may not have started */ }
          this.releaseSoundSource(source, level);
        } else if (level) {
          try { level.disconnect(); } catch { /* optional on older WeChat runtimes */ }
        }
        // Other effects retain their oscillator recipe if recording playback fails.
      }
    }
    // The supplied countdown recording is never synthesized or queued for later.
    if (!recorded && kind !== "timeover") {
      const start = this.context.currentTime + 0.006;
      for (const layer of SOUND_RECIPES[kind]) this.tone(layer, start, this.effectsBus);
    }
    if (this.enabled && this.scene !== "silent" && !this.musicSource && this.musicTimer === undefined) this.startMusic();
  }

  stopSound(kind: SoundKind): void {
    if (kind !== "timeover" || !this.timeoverSound) return;
    const { source, level } = this.timeoverSound;
    source.onended = null;
    try { source.stop(); } catch { /* source may already have ended */ }
    this.releaseSoundSource(source, level);
  }

  private releaseSoundSource(source: AudioBufferSourceNode, level?: GainNode): void {
    if (this.timeoverSound?.source === source) this.timeoverSound = undefined;
    source.onended = null;
    try { source.disconnect(); } catch { /* optional on older WeChat runtimes */ }
    try { source.buffer = null; } catch { /* optional on older WeChat runtimes */ }
    try { level?.disconnect(); } catch { /* optional on older WeChat runtimes */ }
  }

  suspend(): void {
    this.suspended = true;
    this.stopSound("timeover");
    this.stopMusic();
    this.stopMusicSource();
    try { void this.context.suspend(); } catch { /* optional on older WeChat runtimes */ }
  }

  resume(): void {
    this.suspended = false;
    this.resumeContext();
    if (this.enabled && this.scene !== "silent") this.startMusic();
  }

  private resumeContext(): void {
    try {
      if (this.context.state === "suspended") void this.context.resume();
    } catch { /* audio remains a progressive enhancement */ }
  }

  private normalizePlaylist(playlist?: readonly MusicTrack[]): MusicTrack[] {
    if (!playlist || playlist.length === 0) return [];
    const normalized: MusicTrack[] = [];
    for (const track of playlist) {
      if (!MUSIC_CATALOG.some((entry) => entry.id === track) || normalized.includes(track)) continue;
      normalized.push(track);
    }
    return normalized;
  }

  private samePlaylist(left: readonly MusicTrack[], right: readonly MusicTrack[]): boolean {
    return left.length === right.length && left.every((track, index) => track === right[index]);
  }

  private playlistStartTrack(requested?: MusicTrack): MusicTrack | undefined {
    if (this.musicPlaylist.length === 0) return requested;
    return requested && this.musicPlaylist.includes(requested)
      ? requested
      : this.musicPlaylist[0];
  }

  private scheduleMusicEnd(track: MusicTrack, positionSeconds: number, generation: number): void {
    if (this.musicPlaylist.length <= 1) return;
    if (this.musicEndTimer !== undefined) clearTimeout(this.musicEndTimer);
    const duration = this.musicBuffers[track]?.loopDuration
      ?? RECORDED_MUSIC_LOOP_DURATIONS[track]
      ?? musicCatalogEntry(track).loopEndSeconds;
    const remaining = Math.max(0.05, duration - Math.max(0, positionSeconds));
    this.musicEndTimer = setTimeout(() => {
      this.musicEndTimer = undefined;
      this.advancePlaylist(track, generation);
    }, Math.max(50, Math.round((remaining + 0.04) * 1_000)));
  }

  private advancePlaylist(track: MusicTrack, generation: number): void {
    if (generation !== this.musicGeneration
      || this.musicPaused || this.suspended || !this.enabled || this.scene === "silent"
      || this.activeMusicTrack !== track || this.musicPlaylist.length <= 1) return;
    const index = this.musicPlaylist.indexOf(track);
    if (index < 0) return;
    this.stopMusicSource();
    this.musicPosition = 0;
    this.musicPositionStartedAt = undefined;
    this.activeMusicTrack = this.musicPlaylist[(index + 1) % this.musicPlaylist.length];
    this.startMusic();
  }

  private startMusic(): void {
    if (!this.enabled || this.scene === "silent" || this.suspended || this.musicPaused) return;
    const track = this.activeMusicTrack
      ?? this.playlistStartTrack(musicTrackForScene(this.scene, this.selectedMusicTrack));
    if (!track) return;
    this.activeMusicTrack = track;
    // A single soundscape owns both the default background and the music
    // library. Asset-loading callbacks can request a restart while the same
    // source is already playing; keep that request idempotent so two copies
    // of the background track can never overlap.
    if (this.musicSource && this.musicSourceTrack === track) return;
    this.stopMusic();
    this.musicPositionStartedAt = this.context.currentTime;
    const recorded = this.musicBuffers[track];
    if (this.musicSource && this.musicSourceTrack !== track) this.stopMusicSource();
    if (this.pendingMusic.has(track) && !recorded) return;
    this.musicStep = 0;
    const now = this.context.currentTime;
    const targetVolume = recorded
      ? ({ menu: 0.24, gameplay: 0.25, danger: 0.275, victory: 0.2, defeat: 0.155 } as const)[this.scene]
      : MUSIC_PATTERNS[this.scene].volume;
    try {
      this.musicBus.gain.cancelScheduledValues?.(now);
      this.musicBus.gain.setValueAtTime(0.0001, now);
      this.musicBus.gain.exponentialRampToValueAtTime(targetVolume, now + 0.18);
    } catch {
      this.musicBus.gain.value = targetVolume;
    }
    if (recorded && typeof this.context.createBufferSource === "function") {
      if (!this.musicSource) {
        let source: AudioBufferSourceNode | undefined;
        try {
          source = this.context.createBufferSource();
          source.buffer = recorded.buffer;
          const usePlaylist = this.musicPlaylist.length > 1;
          source.loop = !usePlaylist;
          source.loopStart = Math.min(RECORDED_MUSIC_LOOP_STARTS[track] ?? 0, recorded.buffer.duration);
          source.loopEnd = Math.min(
            source.loopStart + recorded.loopDuration,
            recorded.buffer.duration,
          );
          source.connect(this.musicBus);
          const offset = Math.min(
            Math.max(0, this.musicPosition),
            Math.max(0, recorded.loopDuration - 0.001),
          );
          source.start(now + 0.025, usePlaylist ? offset : Math.max(source.loopStart, offset));
          const generation = ++this.musicGeneration;
          const ownedSource = source;
          source.onended = () => {
            this.releaseSoundSource(ownedSource);
            if (this.musicSource === ownedSource) {
              this.musicSource = undefined;
              this.musicSourceTrack = undefined;
              if (usePlaylist) this.advancePlaylist(track, generation);
            }
          };
          this.musicSource = source;
          this.musicSourceTrack = track;
          this.scheduleMusicEnd(track, offset, generation);
        } catch {
          if (source) {
            try { source.stop(); } catch { /* playback may not have started */ }
            this.releaseSoundSource(source);
          }
          delete this.musicBuffers[track];
          this.useSynthMusicFallback(track);
        }
      }
      return;
    }
    this.scheduleMusicStep();
    this.scheduleMusicEnd(track, this.musicPosition, ++this.musicGeneration);
  }

  private stopMusic(): void {
    if (this.musicTimer !== undefined) {
      clearTimeout(this.musicTimer);
      this.musicTimer = undefined;
    }
    if (this.musicEndTimer !== undefined) {
      clearTimeout(this.musicEndTimer);
      this.musicEndTimer = undefined;
    }
    const now = this.context.currentTime;
    try {
      this.musicBus.gain.cancelScheduledValues?.(now);
      this.musicBus.gain.setValueAtTime(Math.max(0.0001, this.musicBus.gain.value), now);
      this.musicBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    } catch {
      this.musicBus.gain.value = 0.0001;
    }
    for (const voice of this.musicVoices) {
      try { voice.stop(now + 0.065); } catch { /* voice may already have ended */ }
    }
    this.musicVoices.clear();
  }

  private stopMusicSource(): void {
    if (this.musicEndTimer !== undefined) {
      clearTimeout(this.musicEndTimer);
      this.musicEndTimer = undefined;
    }
    this.musicGeneration += 1;
    if (!this.musicSource) return;
    const source = this.musicSource;
    source.onended = null;
    try { source.stop(); } catch { /* source may already have stopped */ }
    this.releaseSoundSource(source);
    this.musicSource = undefined;
    this.musicSourceTrack = undefined;
  }

  private scheduleMusicStep(): void {
    if (!this.enabled || this.scene === "silent" || this.suspended) return;
    const pattern = MUSIC_PATTERNS[this.scene];
    const index = this.musicStep % pattern.lead.length;
    const stepSeconds = 60 / pattern.bpm * pattern.stepBeats;
    const start = this.context.currentTime + 0.025;
    const lead = pattern.lead[index];
    const bass = pattern.bass[index % pattern.bass.length];
    if (lead != null) {
      this.tone({
        type: pattern.leadType,
        frequency: midiFrequency(lead),
        endFrequency: midiFrequency(lead) * 0.985,
        duration: stepSeconds * 0.82,
        gain: this.scene === "danger" ? 0.035 : 0.052,
        attack: 0.012,
      }, start, this.musicBus, true);
    }
    if (bass != null) {
      this.tone({
        type: "sine",
        frequency: midiFrequency(bass),
        endFrequency: midiFrequency(bass) * 0.99,
        duration: stepSeconds * 1.75,
        gain: 0.065,
        attack: 0.025,
      }, start, this.musicBus, true);
      if (index % 8 === 0 && this.scene !== "danger") {
        this.tone({
          type: "sine",
          frequency: midiFrequency(bass + 7),
          duration: stepSeconds * 4.8,
          gain: 0.018,
          attack: 0.16,
        }, start, this.musicBus, true);
      }
    }
    this.musicStep += 1;
    this.musicTimer = setTimeout(() => {
      this.musicTimer = undefined;
      this.scheduleMusicStep();
    }, Math.max(40, Math.round(stepSeconds * 1_000)));
  }

  private tone(layer: ToneLayer, baseStart: number, destination: AudioNode, music = false): void {
    let oscillator: OscillatorNode | undefined;
    let envelope: GainNode | undefined;
    const release = () => {
      if (oscillator) {
        oscillator.onended = null;
        this.musicVoices.delete(oscillator);
        try { oscillator.disconnect(); } catch { /* optional on older WeChat runtimes */ }
      }
      try { envelope?.disconnect(); } catch { /* optional on older WeChat runtimes */ }
    };
    try {
      oscillator = this.context.createOscillator();
      envelope = this.context.createGain();
      oscillator.onended = release;
      const start = baseStart + (layer.offset ?? 0);
      const attack = Math.min(layer.duration * 0.35, layer.attack ?? 0.008);
      const end = start + layer.duration;
      oscillator.type = layer.type;
      oscillator.frequency.setValueAtTime(layer.frequency, start);
      if (layer.endFrequency && layer.endFrequency > 0) {
        oscillator.frequency.exponentialRampToValueAtTime(layer.endFrequency, end);
      }
      if (layer.detune) oscillator.detune.setValueAtTime(layer.detune, start);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, layer.gain), start + attack);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(envelope);
      envelope.connect(destination);
      if (music) {
        this.musicVoices.add(oscillator);
      }
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    } catch {
      try { oscillator?.stop(); } catch { /* playback may not have started */ }
      release();
    }
  }
}
