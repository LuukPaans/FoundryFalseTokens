# False Tokens

Foundry v13/v14 module (systeem: D&D 5e) waarmee een GM een token een effect
kan geven dat alleen bepaalde spelers merken — **illusie** (andere afbeelding)
of **onzichtbaar** — met per-speler instelbaar wie het effect ondervindt.

## Gebruik

1. Selecteer een token. In de Token HUD (het menu dat verschijnt als je op een
   token klikt) verschijnt een maskericoontje rechts, alleen zichtbaar voor de GM.
2. Klik erop om het configuratievenster te openen:
   - **Effect active** — hoofdschakelaar voor dit token.
   - **Type** — **Illusion** (andere afbeelding) of **Invisible** (onzichtbaar).
     Bij Illusion toont het venster ook **Illusion image**: de nepafbeelding
     die aangevinkte spelers zien. Schakel je naar Invisible, dan verdwijnt
     dat veld uit beeld — de eerder ingevulde afbeelding blijft gewoon bewaard
     voor het geval je teruggaat naar Illusion.
   - Onderaan ("Is affected" / "Cannot see this token"): per-speler
     checkboxen. **Aangevinkt = die speler ondervindt het effect** (ziet de
     illusie, of ziet het token bij Invisible helemaal niet). Niet aangevinkt
     = die speler ziet gewoon de waarheid. Twee knoppen ("Mark everyone" /
     "Clear everyone") zetten in één klik iedereen aan/uit.
3. Wijzigingen worden direct toegepast (geen aparte opslaan-knop nodig).

Er is geen UI meer voor een aparte "ware afbeelding": de huidige
tokenafbeelding is altijd de waarheid.

### Invisible

Voor aangevinkte spelers is het token gewoon onzichtbaar (niet aanwezig op hun
canvas) — verder geen aparte afbeelding nodig. De GM ziet, net als in
standaard Foundry/D&D, altijd een doorschijnende (50% alpha) versie van het
token, ongeacht de DM-previewmodus hieronder.

### DM-preview (Illusion-type)

Naast het maskericoontje staat, in de **linkerkolom** van de Token HUD, een
oog-icoontje: de **DM-preview-toggle**. Staat die **uit** (standaard), dan
ziet de GM altijd gewoon de echte afbeelding — precies zoals voorheen. Staat
hij **aan**, dan verandert het selecteren van spelertokens op canvas wat de
GM voor elk geïllusioneerd token ziet:

- Alle geselecteerde spelers zien hetzelfde:
  - allemaal de waarheid → GM ziet de echte afbeelding, geen tint.
  - allemaal de illusie → GM ziet de illusie-afbeelding met een lichte paarse
    tint erover, zodat meteen duidelijk is dat het om een illusie gaat.
- Geselecteerde spelers zijn het oneens (bv. 1 ziet de waarheid, 2 de illusie)
  → GM ziet de echte afbeelding met een paars getinte "geest" van de illusie
  op 40% dekking erover.
- Geen spelertoken geselecteerd → gewoon de echte afbeelding.

Deselecteer de spelertoken(s), of zet de toggle uit, om terug te gaan naar de
normale GM-weergave.

### Scene-brede aan/uit

In de **Scene Controls** aan de linkerkant van het canvas (dezelfde werkbalk
als "select token" en "measure") staan, in de Token-tools-groep, twee extra
knoppen: **alles aan** en **alles uit**. Die zetten in één klik **elk
geconfigureerd effect in de huidige scene** (illusie én invisible, op alle
tokens) actief of inactief — handig voor het moment dat een illusie voor de
hele groep tegelijk breekt of juist triggert, zonder elk token los te hoeven
aanpassen of eerst een token te hoeven selecteren.

## Structuur

- `module.json` — manifest (v13+, systeem `dnd5e`).
- `scripts/illusion-data.js` — dataflag op de TokenDocument
  (`flags.false-tokens.illusion`: `active`, `type`, `illusionImg`, `trueImg`,
  `fooled`) en de logica die per gebruiker bepaalt wat die moet zien, de
  client-setting voor de DM-preview-toggle, en de scene-brede alles-aan/uit.
- `scripts/illusion-render.js` — past clientside toe wat `illusion-data.js`
  bepaalt: PIXI-texture wisselen (`token.mesh.texture`) voor illusies,
  `token.visible` **en** `token.mesh.visible` uitzetten voor onzichtbaarheid
  (het token zelf en zijn artwork zitten in aparte render-lagen — allebei nodig
  om echt niets meer te tonen), `token.mesh.alpha` verlagen voor de GM's
  doorschijnende weergave, en het on-the-fly samenstellen van de paars-getinte
  preview-afbeeldingen via een offscreen `<canvas>`. Texture-cache zodat
  `refreshToken` (elke animatieframe) niet steeds opnieuw laadt/bouwt.
- `scripts/illusion-hud.js` — voegt het maskericoontje (rechts) en de
  DM-preview-toggle (links) toe aan de Token HUD.
- `scripts/illusion-scene-controls.js` — voegt de twee scene-brede
  aan/uit-knoppen toe aan de Token-groep van de Scene Controls-werkbalk
  (via `getSceneControlButtons`, v13+ object-gebaseerde API).
- `scripts/illusion-config-app.js` — het configuratievenster (ApplicationV2).
- `scripts/illusion-combat-tracker.js` — vervangt clientside de portret-`<img>`
  in de Combat Tracker (ook popped-out trackers) voor het Illusion-type,
  en forceert een her-render van de tracker zodra de GM een effect aanpast.
- `templates/illusion-config.hbs`, `styles/module.css`, `lang/en.json`.

## Compatibiliteit met Token Flip-achtige modules

Deze module wijzigt alleen `token.mesh.texture`, `token.visible` en
`token.mesh.alpha`; modules die tokens spiegelen doen dat via
`token.mesh.scale` (horizontaal omdraaien) — een losse property, dus een
gespiegelde token toont gewoon de illusie- of ware afbeelding gespiegeld. Er
wordt geen scene-control-knop, geen gedeelde flag-namespace en geen bestaand
HUD-icoon aangeraakt — alles zit onder de eigen `flags.false-tokens`
namespace en eigen icoontjes.

## Bekende beperkingen

- **Alleen de canvas-tokenafbeelding en (voor Illusion) het Combat
  Tracker-portret worden afgeschermd.** Het chatkaartje bij een actie en het
  actorblad zelf tonen nog steeds de echte afbeelding/naam; voor Invisible
  toont de Combat Tracker het token ook nog gewoon (niet verborgen) — laat
  het weten als dat ook moet.
- **Niet cheat-proof.** Alle data (welke afbeelding, wie ziet wat) staat
  gesynchroniseerd naar elke client; een speler die de browser
  devtools/console gebruikt kan dit uitlezen. Bewuste keuze voor eenvoud,
  in plaats van een GM-geautoriseerde (socket)aanpak die dat had voorkomen
  maar wel altijd een online GM vereist.
- De bijgewerkte DM-preview-kleuren en de scene-brede aan/uit-knoppen zijn
  nieuw en nog niet live getest.
