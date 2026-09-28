import { ColorEscapeGame } from "./game/ColorEscapeGame";
import { WechatHost } from "./platform/WechatHost";
import { launchWechatGameWhenReady } from "./platform/wechatRuntime";

declare const wx: any;

launchWechatGameWhenReady(wx, () => {
  new ColorEscapeGame(new WechatHost()).start();
});
