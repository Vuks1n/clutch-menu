vibe coded cuz the whole game vibe coded lol
# Clutch Menu

A browser overlay menu for the game at **clutcher.io**, built as a study project for how browser games expose their internals (game state on `window`, mutable camera/weapon objects, etc).

> **Disclaimer / important**
>
> This project is published **for research and educational purposes ONLY**.
> It exists to demonstrate how overlay UIs, world-to-screen projection, and keybind handling work in a browser environment.
>
> - Do **NOT** use it to gain an unfair advantage in any game.
> - Do **NOT** use it on accounts you don't own, in ranked play, or anywhere against a game's rules/ToS.
> - The author is **not affiliated** with clutcher.io and takes no responsibility for how you use or misuse this code.
> - Using cheats in online games can get your account permanently banned. That's on you, not the author.

## Features

### RAGE
- Silent Aim (server-side angles unchanged, FOV-limited)
- Wallbang (temporary collision bypass on shot)
- Rage FOV slider
- One-click "enable everything" preset

### LEGIT
- Aimbot with FOV, smoothness and visibility check
- Hold **E** to aim

### VISUALS
- ESP: box, name, health bar, snaplines, head dot, distance, custom color
- Radar (size + range sliders)
- FOV changer + FOV circle preview
- FPS watermark

### MISC
- Bunny hop
- Anti-recoil

### SETTINGS
- Rebindable Menu / Panic keys (Insert / Delete by default)
- 5 accent colors
- **COPY CONFIG** — copies your full config as text
- **PASTE CONFIG** — imports a copied config from your clipboard (invalid/partial configs are safely rejected, unknown keys ignored)
- **RESET CONFIG** — back to defaults
- Panic key turns everything off instantly

## Install (unpacked, developer mode)

1. Download / clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder
5. Open https://clutcher.io/ and press **Insert** to open the menu

The extension only runs on `https://clutcher.io/*` — nothing else.

## Credits

- **Made by Vuks1n**
- Discord: `sanity.kys`

## License

For research/educational use only. No warranty. Don't be a dummy with it.
