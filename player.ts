import { Pane, PaneEvent } from "./deps.ts";
import { GBA, KeyCode } from "./gba.ts";

export type KeyMap = {
  [name in string | number]: string | number;
};

export interface SaveOptions {
  loadPath: string;
  savePath: string;
}

export class GBAPlayer {
  gba: GBA;
  pane: Pane;
  _interval: number;
  state = new Map<string, any>();
  stopped = false;

  constructor(
    public rom: Uint8Array,
    public keyMap: KeyMap,
    public save: string
  ) {
    this.gba = new GBA();
    this.gba.loadROM(rom);
    const info = this.gba.getGameInfo();
    if (!info) {
      console.log("Invalid ROM.");
      Deno.exit();
    }
    console.log("Loaded ROM!");
    console.log("  Title:", info.title);
    console.log("   Code:", info.code);
    console.log("  Maker:", info.maker);
    console.log("   Save:", info.saveType);

    if (save !== undefined) {
      try {
        const data = Deno.readFileSync(save);
        if (data.length) {
          this.gba.loadSaveData(data);
          console.log("Loaded save file.");
        }
      } catch (e) {
        Deno.createSync(save);
        console.log("Save file not present, created on given path.");
      }
    }

    this.keyMap = Object.assign(
      {
        Z: "A",
        X: "B",
        Left: "LEFT",
        Right: "RIGHT",
        Up: "UP",
        Down: "DOWN",
        Q: "L",
        W: "R",
        Return: "START",
        Space: "SELECT",
      },
      this.keyMap
    );

    this.pane = new Pane(GBA.WIDTH, GBA.HEIGHT);
    const pane = this.pane;

    pane.setTitle(`DenoGBA | ${this.gba.getGameInfo()?.title ?? "No Game"}`);
    pane.setResizable(false);

    pane.setInnerSize({
      logical: { width: GBA.WIDTH * 2, height: GBA.HEIGHT * 2 },
    });
    pane.setMinInnerSize({
      logical: { width: GBA.WIDTH * 2, height: GBA.HEIGHT * 2 },
    });
    pane.setMaxInnerSize({
      logical: { width: GBA.WIDTH * 2, height: GBA.HEIGHT * 2 },
    });

    this._interval = setInterval(() => {
      for (const event of Pane.Step()) {
        try {
          this.processEvent(event);
        } catch (e) {
          console.log(e);
        }
      }
    }, 1000 / 60);

    this.gba.run();
  }

  private async processEvent(event: PaneEvent) {
    const pane = this.pane;

    switch (event.type) {
      case "windowEvent":
        if (event.value.windowId !== this.pane.id) break;

        switch (event.value.event.type) {
          case "closeRequested":
            this.stopped = true;
            clearInterval(this._interval);
            this.gba.pause();
            this.gba.stop();
            break;

          case "keyboardInput":
            const evt = event.value.event.value.input;
            if (!evt || evt.scancode === 0) break;

            if (evt.virtualKeycode) {
              if (
                evt.virtualKeycode === "LControl" ||
                evt.virtualKeycode === "RControl"
              ) {
                this.state.set("ctrl", evt.state === "pressed");
              }

              if (this.state.get("ctrl") === true) {
                if (evt.state !== "released") break;
                if (evt.virtualKeycode === "S") {
                  const data = this.gba.getSaveData();
                  if (data !== undefined) {
                    await Deno.writeFile(this.save, data)
                      .then(() =>
                        console.log(`[Log] Written save to: ${this.save}`)
                      )
                      .catch((e) => console.log("[Err] Failed to save:", e));
                  }
                } else if (evt.virtualKeycode === "L") {
                  const data = await Deno.readFile(this.save).catch(
                    () => undefined
                  );
                  if (data) {
                    try {
                      this.gba.loadSaveData(data);
                      console.log(`[Log] Loaded save file from: ${this.save}`);
                    } catch (e) {
                      console.log("[Err] Failed to load save file:", e.message);
                    }
                  }
                } else if (evt.virtualKeycode === "P") {
                  this.gba.pause();
                }
              }
            }

            let mapping: any =
              (evt.virtualKeycode !== undefined
                ? this.keyMap[evt.virtualKeycode]
                : undefined) ?? this.keyMap[evt.scancode];

            if (typeof mapping !== "string" && typeof mapping !== "number")
              break;
            if (typeof mapping === "string")
              mapping = (KeyCode as any)[mapping];

            if (evt.state === "released") this.gba.keyUp(mapping);
            else if (evt.state === "pressed") this.gba.keyDown(mapping);
            break;
        }
        break;

      case "redrawRequested":
        const pixels = this.stopped ? undefined : this.gba.getPixels();
        pane.drawFrame(
          pixels ?? new Uint8Array(GBA.WIDTH * GBA.HEIGHT * 4).fill(255)
        );
        pane.renderFrame();
        pane.requestRedraw();
        break;
    }
  }
}
