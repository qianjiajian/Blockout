import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// Chapter cards and controls stay with the other Journey UI in meta-ui. Only
// the optional, full-screen Home backgrounds need the separate theme package.
export const WECHAT_JOURNEY_HOME_THEME_NAMES = Object.freeze(
  Array.from({ length: 9 }, (_, index) => `home-${String(index + 2).padStart(2, '0')}.jpg`),
);

export async function prepareWechatJourneyThemes(root, output) {
  const themeOutput = resolve(output, 'journey-themes');
  const journeySource = resolve(root, 'public/assets/art/ui/formal-pages/journey');
  const journeyUiOutput = resolve(output, 'meta-ui/formal-pages/journey');
  await mkdir(themeOutput, { recursive: true });
  await cp(resolve(root, 'wechat/journey-themes/game.js'), resolve(themeOutput, 'game.js'));
  for (const name of WECHAT_JOURNEY_HOME_THEME_NAMES) {
    await cp(resolve(journeySource, name), resolve(themeOutput, name));
    await rm(resolve(journeyUiOutput, name), { force: true });
  }
}
