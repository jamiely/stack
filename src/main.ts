import "./styles.css";
import { Game } from "./game/Game";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("App root element not found.");
}

const game = new Game(root);
game.mount();
