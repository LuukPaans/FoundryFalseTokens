# False Tokens

Foundry v13/v14 module (systeem: D&D 5e) waarmee een GM een token een tweede,
"vervalste" afbeelding kan geven die alleen bepaalde spelers te zien krijgen —
bedoeld voor illusies/vermommingen: spelers die "doorheen kijken" zien de echte
afbeelding, de rest ziet de illusie.

## Gebruik

1. Selecteer een token. In de Token HUD (het menu dat verschijnt als je op een
   token klikt) verschijnt een maskericoontje, alleen zichtbaar voor de GM.
2. Klik erop om het illusie-venster te openen:
   - **Illusion active** — hoofdschakelaar voor deze token.
   - **Illusion image** — de nepafbeelding die "gefooled" spelers zien.
   - **True image** — optioneel; leeg = de huidige tokenafbeelding.
   - **Sees the true image** — per-speler checkbox, plus twee knoppen om in één
     klik iedereen te laten fooien of iedereen de waarheid te laten zien.
3. Wijzigingen worden direct toegepast (geen aparte opslaan-knop nodig).

De GM ziet altijd de echte afbeelding.

## Structuur

- `module.json` — manifest (v13+, systeem `dnd5e`).
- `scripts/illusion-data.js` — dataflag op de TokenDocument
  (`flags.false-tokens.illusion`) en de logica die bepaalt welke afbeelding een
  gegeven gebruiker moet zien.
- `scripts/illusion-render.js` — wisselt clientside de PIXI-texture van het
  token (`token.mesh.texture`) op basis van die logica, met een texture-cache
  zodat `refreshToken` (elke animatieframe) niet steeds opnieuw laadt.
- `scripts/illusion-hud.js` — voegt het maskerpictogram toe aan de Token HUD.
- `scripts/illusion-config-app.js` — het configuratievenster (ApplicationV2).
- `scripts/illusion-combat-tracker.js` — vervangt clientside de portret-`<img>` in
  de Combat Tracker (ook popped-out trackers) volgens dezelfde logica, en forceert
  een her-render van de tracker zodra de GM een illusie aanpast.
- `templates/illusion-config.hbs`, `styles/module.css`, `lang/en.json`.

## Compatibiliteit met Token Flip-achtige modules

Deze module wijzigt alleen `token.mesh.texture` (welke afbeelding er getoond
wordt); modules die tokens spiegelen doen dat via `token.mesh.scale`
(horizontaal omdraaien). Dat zijn losse PIXI-properties, dus een gespiegelde
token toont gewoon de illusie- of ware afbeelding gespiegeld. Er wordt geen
scene-control-knop, geen gedeelde flag-namespace en geen bestaand
HUD-icoon aangeraakt — alles zit onder de eigen `flags.false-tokens`
namespace en een eigen icoontje.

## Bekende beperkingen

- **De canvas-tokenafbeelding en het Combat Tracker-portret wisselen mee.**
  Het chatkaartje bij een actie en het actorblad zelf tonen nog steeds de
  echte afbeelding/naam — laat het weten als dat ook afgeschermd moet worden.
- **Niet cheat-proof.** De echte en illusie-afbeelding staan allebei in de
  gesynchroniseerde tokendata; een speler die de browser devtools/console
  gebruikt kan het pad van de echte afbeelding vinden. Dit was een bewuste
  keuze voor eenvoud, in plaats van een GM-geautoriseerde (socket)aanpak die
  dat had voorkomen, maar wel altijd een online GM vereist.
- Nog niet getest tegen een draaiende Foundry-installatie (geen instance
  beschikbaar hier) — met name de exacte CSS-structuur van de Token HUD kan
  per v13/v14-(sub)versie verschillen. De HUD-injectie zoekt daarom eerst naar
  `.col.right`, dan `.col.left`, en valt anders terug op de HUD-root, zodat het
  icoon sowieso ergens verschijnt.
