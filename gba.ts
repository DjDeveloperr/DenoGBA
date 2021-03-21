import { GBACore, decode } from "./deps.ts";
import { BIOS_BIN } from "./bios.js";

const BIOS = decode(BIOS_BIN);

export enum KeyCode {
  A = 0,
  B = 1,
  SELECT = 2,
  START = 3,
  RIGHT = 4,
  LEFT = 5,
  UP = 6,
  DOWN = 7,
  R = 8,
  L = 9,
}

Object.assign(globalThis, {
  objwinActive: {},
  tileRow: {},
  addr: {},
});

export interface GameInfo {
  title: string;
  code: string;
  maker: string;
  saveType: string;
}

export class GBA {
  static WIDTH = 240;
  static HEIGHT = 160;

  core: any;

  constructor() {
    this.core = new GBACore();
    this.core.throttle = 8;
    this.core.setBios(BIOS.buffer);
    this.core.setCanvasMemory();
  }

  loadROM(rom: Uint8Array) {
    this.core.setRom(rom.buffer);
  }

  getPixels(): Uint8Array | undefined {
    return this.core.context?.pixelData?.data;
  }

  pressKey(key: KeyCode, time = 100) {
    this.core.keypad.press(key, time);
  }

  keyDown(key: KeyCode) {
    this.core.keypad.keydown(key);
  }

  keyUp(key: KeyCode) {
    this.core.keypad.keyup(key);
  }

  run() {
    this.core.runStable();
  }

  pause() {
    if (!this.core.paused) this.core.paused = true;
    else this.run();
  }

  loadSaveData(data: Uint8Array) {
    this.core.setSavedata(data.buffer);
  }

  getSaveData(): Uint8Array | undefined {
    const data = this.core.mmu?.save?.buffer;
    if (!data) return;
    else return new Uint8Array(data);
  }

  getGameInfo(): GameInfo | undefined {
    const info = this.core.mmu?.cart;
    if (!info) return;
    else
      return {
        title: info.title,
        code: info.code,
        maker: info.maker,
        saveType: info.saveType,
      };
  }

  stop() {
    this.core.reset();
  }
}
