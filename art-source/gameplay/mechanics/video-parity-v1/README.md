# Video-parity mechanism art

## Key and lock contract

In the source-video numeric marker convention, `1` means a chain lock and `2`
means a key token. Runtime pairing is defined by `keyId`: a key and every lock
it releases share the same `keyId`, and every member of that pair or group uses
the same marker `BlockColor` (independent of the carrier block's colour) so the
art communicates the logical pairing.

The eight runtime colors map to native-size RGBA cutouts as follows:

| BlockColor | Key token | Chain lock |
| --- | --- | --- |
| `red` | `key-token-red-v1.png` | `chain-lock-red-v1.png` |
| `blue` | `key-token-blue-v1.png` | `chain-lock-blue-v1.png` |
| `green` | `key-token-green-v1.png` | `chain-lock-green-v1.png` |
| `yellow` | `key-token-yellow-v1.png` | `chain-lock-yellow-v1.png` |
| `purple` | `key-token-v1.png` | `chain-lock-v1.png` |
| `orange` | `key-token-orange-v1.png` | `chain-lock-orange-v1.png` |
| `pink` | `key-token-pink-v1.png` | `chain-lock-pink-v1.png` |
| `cyan` | `key-token-cyan-v1.png` | `chain-lock-cyan-v1.png` |

The unsuffixed files are the purple pair retained for backward-compatible
runtime paths. Key cutouts are 66×84. Lock cutouts are 62×86 except green and
yellow, whose source-native height is 85. All sixteen authored PNGs remain
unchanged; runtime copies keep those native dimensions without resampling and
use the project's deterministic 256-colour transparent-PNG encoding for the
WeChat package budget.

`staged-frame-v1.png` is a provisional project asset generated with the built-in
image generation tool on 2026-09-14. It is deliberately separate from
`lift-frame-v1.png`: the Lv75/Lv78 source device releases a fixed front cohort
only after every cohort block has left the frame, whereas Lift advances layers.

- Source and runtime size: 288×288 RGBA.
- SHA-256: `CCA40213EF5BF6E404398E1C70F7D1CAAF6BFAA6F8DE0022746E50CDE5CBB235`.
- Status: provisional; replaceable one-for-one by keeping the same transparent
  center, filename and manifest dimensions.
- Built-in output retained at
  `C:/Users/Administrator/.codex/generated_images/01a06d13-b97c-7740-a7b0-e077805446d2/exec-d82e4822-5f4f-45ee-928f-f6edddc7e01c.png`.

Generation prompt:

> Create an original, top-down, square, nine-slice-friendly fixed staged-release
> frame for a polished casual mobile block puzzle: cool lavender/cyan molded
> metal and translucent glass, reinforced rounded corners, cyan inner glow,
> transparent background and open transparent center. One object only; no
> blocks, text, numbers, arrows, locks, lift iconography, logo or watermark.
