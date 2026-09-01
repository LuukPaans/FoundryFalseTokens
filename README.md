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

De GM ziet standaard altijd de echte afbeelding, met één uitzondering: de
**preview-modus**. Selecteer je op canvas één of meer spelertokens, dan
toont elke geïllusioneerde token voor jou wat die speler(s) zien:

- Alle geselecteerde spelers zien hetzelfde (allemaal doorheen, of allemaal
  gefooid) → je ziet precies die afbeelding.
- Geselecteerde spelers zijn het oneens (bv. 1 ziet doorheen, 2 zijn gefooid)
  → je ziet de echte afbeelding met een paarse, 20%-transparante "geest" van
  de illusie erover — een visueel signaal dat de groep niet hetzelfde ziet.
- Geen spelertoken geselecteerd → gewoon de echte afbeelding, zoals altijd.

Deselecteer de spelertoken(s) om terug te gaan naar de normale GM-weergave.

## Structuur

- `module.json` — manifest (v13+, systeem `dnd5e`).
- `scripts/illusion-data.js` — dataflag op de TokenDocument
  (`flags.false-tokens.illusion`) en de logica die bepaalt welke afbeelding een
  gegeven gebruiker moet zien.
- `scripts/illusion-render.js` — wisselt clientside de PIXI-texture van het
  token (`token.mesh.texture`) op basis van die logica, met een texture-cache
  zodat `refreshToken` (elke animatieframe) niet steeds opnieuw laadt. Voor de
  GM regelt dit bestand ook de preview-modus (zie hierboven), inclusief het
  on-the-fly samenstellen van de paarse "geest"-afbeelding via een offscreen
  `<canvas>` wanneer geselecteerde spelers het oneens zijn.
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
- De GM-previewmodus (hierboven) is nieuw en nog niet live getest — met name
  de kleurmenging van de "geest"-afbeelding kan er anders uitzien dan bedoeld
  afhankelijk van de brontexturen. Laat weten hoe het eruitziet.
