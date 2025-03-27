declare module 'wavesurfer.js/dist/wavesurfer.js' {
  interface WaveSurferOptions {
    container: HTMLElement | string;
    waveColor?: string | string[];
    progressColor?: string | string[];
    cursorColor?: string;
    cursorWidth?: number;
    height?: number;
    width?: number | string;
    minPxPerSec?: number;
    normalize?: boolean;
    fillParent?: boolean;
    audioContext?: AudioContext;
    autoCenter?: boolean;
    scrollParent?: boolean;
    hideScrollbar?: boolean;
    peaks?: number[];
    duration?: number;
    mediaControls?: boolean;
    backend?: string;
    barWidth?: number;
    barGap?: number;
    barRadius?: number;
    mediaControls?: boolean;
    interact?: boolean;
  }

  interface WaveEventMap {
    'load': [];
    'play': [];
    'pause': [];
    'finish': [];
    'audioprocess': [];
    'error': [Error];
    'ready': [];
    'redraw': [];
    'scroll': [number];
    'zoom': [number];
    'timeupdate': [number];
    'decode': [];
    'loading': [boolean];
    'seeking': [number];
    'interaction': [];
    'destroy': [];
  }

  class WaveSurfer {
    static create(params: WaveSurferOptions): WaveSurfer;
    load(url: string, peaks?: number[], preload?: boolean): Promise<void>;
    loadDecodedBuffer(buffer: AudioBuffer): void;
    play(start?: number, end?: number): void;
    pause(): void;
    destroy(): void;
    stop(): void;
    skip(offset: number): void;
    setTime(time: number): void;
    setVolume(newVolume: number): void;
    getVolume(): number;
    isPlaying(): boolean;
    getCurrentTime(): number;
    getDuration(): number;
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    toggleInteraction(toggle: boolean): void;
    toggleMute(): void;
    on<K extends keyof WaveEventMap>(
      event: K,
      callback: (...args: WaveEventMap[K]) => void
    ): void;
    un<K extends keyof WaveEventMap>(
      event: K,
      callback: (...args: WaveEventMap[K]) => void
    ): void;
    unAll(): void;
  }

  export = WaveSurfer;
}
