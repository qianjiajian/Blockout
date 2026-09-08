import { ColorEscapeGame } from "./game/ColorEscapeGame";
import { WechatHost } from "./platform/WechatHost";

new ColorEscapeGame(new WechatHost()).start();
