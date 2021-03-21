import { parse } from "./deps.ts";
import { GBAPlayer } from "./player.ts";

const args = parse(Deno.args);
const gameFilePath = args._[0];
if (typeof gameFilePath !== "string") {
  console.log("No game file path provided.");
  Deno.exit();
}
const rom = await Deno.readFile(gameFilePath).catch(() => undefined);
if (!rom) {
  console.log("ROM doesn't exist on path: " + gameFilePath);
  Deno.exit();
}

async function validateFile(label: string, path?: string) {
  if (!path) return;
  if (!(await Deno.lstat(path).catch(() => undefined))) {
    console.log("Invalid path specified for " + label);
    Deno.exit();
  } else return path;
}

const saveFile = args["save-file"] ?? args.save ?? args.s;
const keyMapFile = await validateFile(
  args["key-map"] ?? args.controls ?? args.k
);

const keyMap =
  keyMapFile === undefined
    ? {}
    : await Deno.readTextFile(keyMapFile)
        .then((e) => JSON.parse(e))
        .catch((e) => {
          console.log("Failed to load key-map file.");
        });

new GBAPlayer(rom, keyMap, saveFile ?? "game.sav");
