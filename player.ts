import { Gdi, Gfx, Wm } from "./deps.ts";
import { GBA, KeyCode } from "./gba.ts";

function glCreateContext(hWnd: Deno.PointerValue) {
  const hDC = Gdi.GetDC(hWnd)!;
  const hRC = Gfx.wglCreateContext(hDC);
  Gfx.wglMakeCurrent(hDC, hRC);
  glInit(hWnd);
  return [hDC!, hRC!] as const;
}

const textID = new Uint32Array(1);

function glInit(hWnd: Deno.PointerValue) {
  const rect = Wm.allocRECT();
  const recti32 = new Int32Array(rect.buffer);
  Wm.GetClientRect(hWnd, rect);
  Gfx.glViewport(0, 0, recti32[2], recti32[3]);

  Gfx.glMatrixMode(Gfx.GL_PROJECTION);
  Gfx.glLoadIdentity();
  Gfx.glOrtho(
    0,
    recti32[2],
    recti32[3],
    0,
    2048,
    -2048,
  );

  Gfx.glMatrixMode(Gfx.GL_MODELVIEW);
  Gfx.glLoadIdentity();

  Gfx.glDisable(Gfx.GL_DEPTH_TEST);
  Gfx.glDisable(Gfx.GL_STENCIL_TEST);

  Gfx.glEnable(Gfx.GL_TEXTURE_2D);

  Gfx.glGenTextures(1, new Uint8Array(textID.buffer));
  Gfx.glBindTexture(Gfx.GL_TEXTURE_2D, textID[0]);
  Gfx.glTexParameteri(Gfx.GL_TEXTURE_2D, Gfx.GL_TEXTURE_WRAP_S, Gfx.GL_REPEAT);
  Gfx.glTexParameteri(Gfx.GL_TEXTURE_2D, Gfx.GL_TEXTURE_WRAP_T, Gfx.GL_REPEAT);
  Gfx.glTexParameteri(
    Gfx.GL_TEXTURE_2D,
    Gfx.GL_TEXTURE_MIN_FILTER,
    Gfx.GL_NEAREST,
  );
  Gfx.glTexParameteri(
    Gfx.GL_TEXTURE_2D,
    Gfx.GL_TEXTURE_MAG_FILTER,
    Gfx.GL_NEAREST,
  );

  Gfx.glEnableClientState(Gfx.GL_VERTEX_ARRAY);
  Gfx.glEnableClientState(Gfx.GL_TEXTURE_COORD_ARRAY);

  // const wglSwapIntervalEXT = Gfx.wglGetProcAddress("wglSwapIntervalEXT");
  // const wglGetSwapIntervalEXT = Gfx.wglGetProcAddress("wglGetSwapIntervalEXT");
  // if (wglSwapIntervalEXT && wglGetSwapIntervalEXT) {
  //   new Deno.UnsafeFnPointer(
  //     BigInt(wglSwapIntervalEXT),
  //     {
  //       parameters: ["i32"],
  //       result: "void",
  //     },
  //   ).call(1);
  //   console.log(
  //     "Enabled VSync",
  //     new Deno.UnsafeFnPointer(
  //       BigInt(wglGetSwapIntervalEXT),
  //       {
  //         parameters: [],
  //         result: "i32",
  //       },
  //     ).call(),
  //   );
  // }
}

function glDestroy(
  hWnd: Deno.PointerValue,
  hRC: Deno.PointerValue,
  hDC: Deno.PointerValue,
) {
  Gfx.wglMakeCurrent(null, null);
  Gfx.wglDeleteContext(hRC);
  Gdi.ReleaseDC(hWnd, hDC);
}

function glDraw(
  hDC: Deno.PointerValue,
  hRC: Deno.PointerValue,
  hWnd: Deno.PointerValue,
  pixels: Uint8Array,
) {
  Gfx.wglMakeCurrent(hDC, hRC);

  const rect = Wm.allocRECT();
  const recti32 = new Int32Array(rect.buffer);
  Wm.GetClientRect(hWnd, rect);

  // deno-fmt-ignore
  const vertices = new Float32Array([
    0, 0, 0, 0,
    recti32[2], 0, 1, 0,
    0, recti32[3], 0, 1,
    recti32[2], recti32[3], 1, 1,
  ]);
  const verticesu8 = new Uint8Array(vertices.buffer);

  Gfx.glClear(Gfx.GL_COLOR_BUFFER_BIT);
  Gfx.glBindTexture(Gfx.GL_TEXTURE_2D, textID[0]);
  Gfx.glTexImage2D(
    Gfx.GL_TEXTURE_2D,
    0,
    Gfx.GL_RGB,
    GBA.WIDTH,
    GBA.HEIGHT,
    0,
    Gfx.GL_RGBA,
    Gfx.GL_UNSIGNED_BYTE,
    pixels,
  );

  Gfx.glEnableClientState(Gfx.GL_VERTEX_ARRAY);
  Gfx.glEnableClientState(Gfx.GL_TEXTURE_COORD_ARRAY);

  Gfx.glVertexPointer(2, Gfx.GL_FLOAT, 4 * 4, verticesu8);
  Gfx.glTexCoordPointer(
    2,
    Gfx.GL_FLOAT,
    4 * 4,
    verticesu8.slice(8),
  );

  Gfx.glDrawArrays(Gfx.GL_TRIANGLE_STRIP, 0, 4);

  Gfx.glEnd();
  Gfx.glFlush();
}

let ctrl = false;

const createCb = (player: GBAPlayer) =>
  new Deno.UnsafeCallback(
    {
      parameters: ["pointer", "u32", "pointer", "pointer"],
      result: "i32",
    } as const,
    (hWnd, msg, wParam, lParam) => {
      const gba = player.gba;

      switch (msg) {
        case Wm.WM_SIZE: {
          Gfx.glViewport(0, 0, Number(lParam) & 0xffff, Number(lParam) >> 16);
          Wm.PostMessageA(hWnd, Wm.WM_PAINT, null, null);
          return 0;
        }

        case Wm.WM_KEYDOWN: {
          switch (wParam) {
            case 0x11:
              ctrl = true;
              break;

            case 0x25: {
              gba.keyDown(KeyCode.LEFT);
              break;
            }

            case 0x26: {
              gba.keyDown(KeyCode.UP);
              break;
            }

            case 0x27: {
              gba.keyDown(KeyCode.RIGHT);
              break;
            }

            case 0x28: {
              gba.keyDown(KeyCode.DOWN);
              break;
            }

            case 0x41: {
              gba.keyDown(KeyCode.A);
              break;
            }

            case 0x42: {
              gba.keyDown(KeyCode.B);
              break;
            }

            case 0x43: {
              gba.keyDown(KeyCode.L);
              break;
            }

            case 0x44: {
              gba.keyDown(KeyCode.R);
              break;
            }

            case 0x45: {
              gba.keyDown(KeyCode.START);
              break;
            }

            case 0x46: {
              gba.keyDown(KeyCode.SELECT);
              break;
            }

            case 0x53: {
              if (ctrl) {
                const data = player.gba.getSaveData();
                if (data !== undefined) {
                  Deno.writeFile(player.save, data)
                    .then(() =>
                      console.log(`[Log] Written save to: ${player.save}`)
                    )
                    .catch((e) => console.log("[Err] Failed to save:", e));
                }
              }
              break;
            }

            case 0x4c: {
              if (ctrl) {
                const data = Deno.readFileSync(player.save);
                if (data) {
                  try {
                    player.gba.loadSaveData(data);
                    console.log(`[Log] Loaded save file from: ${player.save}`);
                  } catch (e) {
                    console.log("[Err] Failed to load save file:", e.message);
                  }
                }
              }
              break;
            }
          }
          return 0;
        }

        case Wm.WM_KEYUP: {
          switch (wParam) {
            case 0x11:
              ctrl = false;
              break;

            case 0x25: {
              gba.keyUp(KeyCode.LEFT);
              break;
            }

            case 0x26: {
              gba.keyUp(KeyCode.UP);
              break;
            }

            case 0x27: {
              gba.keyUp(KeyCode.RIGHT);
              break;
            }

            case 0x28: {
              gba.keyUp(KeyCode.DOWN);
              break;
            }

            case 0x41: {
              gba.keyUp(KeyCode.A);
              break;
            }

            case 0x42: {
              gba.keyUp(KeyCode.B);
              break;
            }

            case 0x43: {
              gba.keyUp(KeyCode.L);
              break;
            }

            case 0x44: {
              gba.keyUp(KeyCode.R);
              break;
            }

            case 0x45: {
              gba.keyUp(KeyCode.START);
              break;
            }

            case 0x46: {
              gba.keyUp(KeyCode.SELECT);
              break;
            }
          }
          return 0;
        }

        case Wm.WM_CLOSE: {
          player.stopped = true;
          player.gba.pause();
          player.gba.stop();
          glDestroy(hWnd, player.rc, player.dc);
          Wm.DestroyWindow(hWnd);
          Deno.exit(0);
        }
      }
      return Number(
        Wm.DefWindowProcA(
          hWnd,
          msg,
          wParam,
          lParam,
        ),
      );
    },
  );

function createWindow(
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const hWnd = Wm.CreateWindowExA(
    Wm.WS_EX_OVERLAPPEDWINDOW,
    "DenoGBA",
    title,
    Wm.WS_OVERLAPPEDWINDOW | Wm.WS_CLIPSIBLINGS | Wm.WS_CLIPCHILDREN,
    x,
    y,
    width,
    height,
    null,
    null,
    null,
    null,
  );

  if (!hWnd) {
    Wm.MessageBoxA(
      null,
      "CreateWindowEx() failed: Cannot create a window.",
      "Error",
      0,
    );
    return;
  }

  const hdc = Gdi.GetDC(hWnd);

  const pfd = Gfx.allocPIXELFORMATDESCRIPTOR({
    nSize: 40,
    nVersion: 1,
    dwFlags: Gfx.PFD_DRAW_TO_WINDOW | Gfx.PFD_SUPPORT_OPENGL,
    iPixelType: Gfx.PFD_TYPE_RGBA,
    cColorBits: 32,
    cDepthBits: 24,
    iLayerType: Gfx.PFD_MAIN_PLANE,
  });

  const pf = Gfx.ChoosePixelFormat(hdc, pfd);
  if (!pf) {
    Wm.MessageBoxA(
      null,
      "ChoosePixelFormat() failed: Cannot find a suitable pixel format.",
      "Error",
      0,
    );
    return;
  }

  if (!Gfx.SetPixelFormat(hdc, pf, pfd)) {
    Wm.MessageBoxA(
      null,
      "SetPixelFormat() failed: Cannot set format specified.",
      "Error",
      0,
    );
    return;
  }

  Gfx.DescribePixelFormat(hdc, pf, pfd.byteLength, pfd);

  Gdi.ReleaseDC(hWnd, hdc);

  return hWnd;
}

const msg = Wm.allocMSG();

export type KeyMap = {
  [name in string | number]: string | number;
};

export interface SaveOptions {
  loadPath: string;
  savePath: string;
}

export class GBAPlayer {
  gba: GBA;
  state = new Map<string, any>();
  stopped = false;
  hwnd: Deno.PointerValue;
  dc: Deno.PointerValue;
  rc: Deno.PointerValue;

  constructor(
    public rom: Uint8Array,
    public save: string,
  ) {
    this.gba = new GBA(() => {
      glDraw(
        this.dc,
        this.rc,
        this.hwnd,
        this.gba.getPixels() ??
          new Uint8Array(GBA.WIDTH * GBA.HEIGHT * 4).fill(0xFF),
      );
      Gfx.SwapBuffers(this.dc);

      while (Wm.PeekMessageA(msg, null, 0, 0, Wm.PM_REMOVE)) {
        Wm.TranslateMessage(msg);
        Wm.DispatchMessageA(msg);
      }
    });
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
      } catch (_e) {
        Deno.createSync(save);
        console.log("Save file not present, created on given path.");
      }
    }

    const cb = createCb(this);

    const wc = Wm.allocWNDCLASSA({
      style: Wm.CS_OWNDC,
      lpfnWndProc: cb.pointer,
      lpszClassName: "DenoGBA",
    });

    if (!Wm.RegisterClassA(wc)) {
      Wm.MessageBoxA(
        null,
        "RegisterClass() failed: Cannot register window class.",
        "Error",
        0,
      );
      Deno.exit(1);
    }

    this.hwnd = createWindow(
      info.title,
      0,
      0,
      GBA.WIDTH * 2,
      GBA.HEIGHT * 2,
    )!;
    [this.rc, this.dc] = glCreateContext(this.hwnd);
    Wm.ShowWindow(this.hwnd, 1);
    this.gba.run();
  }
}
