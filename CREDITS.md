# Credits

## 3D assets

### Character models (selectable variants)

**`assets/models/sakura_juri.glb`** — renders **Sakura** (default: Juri variant).

- Title: "USFIV JURI"
- Author: [pierodsoto01](https://sketchfab.com/pierodsoto01)
- Source: https://sketchfab.com/3d-models/usfiv-juri-797ead6ca161405ebcd537e4e07b2593
- License: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- Changes: retargeted at runtime onto this project's own animation system (see
  `src/skinnedRig.js`) — no changes were made to the original mesh, skeleton, or
  textures themselves.

**`assets/models/sports_girl.glb`** — renders **Sakura** (Athletic variant) or other characters.

- Title: "Hot Sports Girl"
- Author: [halfbrainanimations](https://sketchfab.com/halfbrainanimations)
- Source: https://sketchfab.com/3d-models/hot-sports-girl-4d852d8b001049d3b9c9aebd547f4728
- License: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- Changes: retargeted at runtime (see `src/skinnedRig.js`) — no mesh or texture
  changes made to the original.

**`assets/models/tina.glb`** — renders **Sakura** (Tina variant) or other characters.

- Title: "Sexy Toon Girl model 2 (Tina 3)"
- Author: ["𝐁𝐈𝐆 𝐅𝐀𝐍 𝟑𝐃 '𝟗𝟐 ＮＩＣＥ ＭＯＤＥＬＳ"](https://sketchfab.com/Number1FanGuy98)
- Source: https://sketchfab.com/3d-models/sexy-toon-girl-model-2-tina-3-7040f4ab02b64138b3dd52065ef52f8f
- License: [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- Changes: retargeted at runtime (see `src/skinnedRig.js`) — embedded animation
  tracks are not used; instead the character plays through the game's pose system
  like other characters.

## Everything else

All other character rigs, animations, stage art, and audio in this project are
original, procedurally generated at runtime (see `src/rig.js`, `src/moves.js`,
`src/audio.js`) — no other external art or audio assets are used. Character
names and move names are stylistic homages to existing fighting-game
franchises; the artwork itself is original.
