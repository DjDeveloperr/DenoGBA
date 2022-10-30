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

const saveFile = args["save-file"] ?? args.save ?? args.s;
new GBAPlayer(rom, saveFile ?? "game.sav");
