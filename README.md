# PagePlus Web

Aplicació d'autoedició (DTP) per al navegador inspirada en **Serif PagePlus X9**. Està escrita en HTML, CSS i JavaScript sense cap framework, funciona sense connexió i té **tema fosc (per defecte) i clar**. La interfície s'adapta a **PC, tauleta i mòbil** (ratolí, llapis i pantalla tàctil).

## Com s'executa

**Opció 1: sense servidor.** Obriu `index.html` amb el navegador (doble clic). Les publicacions es desen al navegador (`localStorage`) i es poden descarregar com a fitxer `.ppw`.

**Opció 2: amb el servidor autònom** (Node.js 16 o posterior, sense dependències):

```bash
node server.js                      # llegeix la configuració del fitxer .env
PORT=3000 node server.js            # les variables d'entorn tenen prioritat sobre el .env
ENV_FILE=/camí/altre.env node server.js   # un altre fitxer de configuració
```

### Configuració (`.env`)

| Paràmetre | Per defecte | Descripció |
|---|---|---|
| `PORT` | `8080` | Port del servidor |
| `HOST` | `127.0.0.1` | `0.0.0.0` per obrir-lo des de tauletes i mòbils de la xarxa local |
| `DATA_DIR` | `data` | Carpeta de les publicacions: relativa a l'aplicació, absoluta (`D:/Publicacions`) o amb `~` (`~/Documents/PagePlus`) |
| `MAX_UPLOAD_MB` | `50` | Mida màxima d'una publicació (les imatges hi van incrustades) |

### Biblioteca amb carpetes

Amb el servidor, **Desa** i l'**Assistent d'inici ▸ Obre una publicació** mostren la biblioteca amb carpetes i subcarpetes:
- **Nova carpeta**, entrar-hi amb un clic i tornar enrere amb el camí de dalt (⌂ Biblioteca › Carpeta › Subcarpeta).
- **Moure** publicacions o carpetes arrossegant-les a una carpeta o al camí de dalt.
- **Canviar el nom o moure** amb el llapis: un nom canvia el nom; `Carpeta/nom` el mou a una subcarpeta; `/Carpeta/nom` parteix de l'arrel.
- **Eliminar** amb la paperera (dos clics per confirmar); les carpetes només s'eliminen si són buides.
- **Desa com a** permet triar carpeta i nom, i avisa abans de substituir una publicació.

Cada publicació es desa com un fitxer llegible `Nom.ppw` dins de la carpeta corresponent de `DATA_DIR`, de manera que també es pot copiar, fer-ne còpia de seguretat o obrir-la amb **Obre un fitxer…**. Els fitxers de versions anteriors es reanomenen automàticament en iniciar el servidor. Sense servidor, la biblioteca del navegador funciona igual (carpetes incloses).

API: `GET /api/docs?dir=carpeta` · `GET|PUT|DELETE /api/docs/carpeta/nom` · `POST|DELETE /api/dirs/carpeta` · `POST /api/move {from, to, dir}`.

> El servidor no té autenticació. Si l'obriu a la xarxa amb `HOST=0.0.0.0`, feu-ho només en una xarxa de confiança.

## Estructura

```
index.html        Esquelet de la interfície
css/style.css     Estils, temes fosc/clar i disseny adaptable
js/util.js        Utilitats: DOM, icones, formularis i diàlegs genèrics, fitxers
js/model.js       Model del document, historial (desfés/refés) i plantilles
js/render.js      Renderitzat d'objectes i pàgines (editor, miniatures, impressió, HTML)
js/editor.js      Espai de treball: eines, selecció, guies, regles, zoom, edició de text
js/ui.js          Ordres, menús, barres, Studio, desar/obrir, publicació i diàlegs
lib/qrcode.js     qrcode-generator 2.0.4 (Kazuhiko Arase, llicència MIT)
server.js         Servidor web opcional (només mòduls integrats de Node.js)
.env              Configuració del servidor (port, adreça, carpeta de publicacions…)
```

Les funcions es reutilitzen a tota l'aplicació. Per exemple:
- `renderPage()` serveix per a l'editor, les miniatures, la previsualització, la impressió/PDF, l'exportació HTML i la comprovació prèvia.
- `form()` genera tots els panells de propietats, la barra de context i la configuració de pàgina.
- `CMD` és l'únic registre d'ordres. D'aquí surten els menús, les barres d'eines, el menú contextual i les dreceres de teclat.

## Funcions (equivalents a PagePlus X9)

| PagePlus X9 | PagePlus Web |
|---|---|
| Publications toolbar / Window menu | Pestanyes amb diverses publicacions obertes alhora (cadascuna amb el seu historial de desfer, zoom i posició), indicador de canvis sense desar, avís en tancar i menú **Finestra** |
| Recent files | **Fitxer ▸ Fitxers recents**: les 10 últimes publicacions obertes o desades (de la biblioteca o de fitxers). La sessió amb totes les pestanyes es recupera en tornar a obrir l'aplicació |
| Startup Assistant | Plantilles de disseny (fulletó, targeta, butlletí, pòster, invitació, calendari), publicacions en blanc i obertura de publicacions recents |
| Publication Setup | Mida del paper (A3–A6, Carta, Legal, DL, targeta, personalitzada), orientació, marges, guies de files i columnes, sagnat i color de fons |
| Page backgrounds | **Imatge de fons** per pàgina o per pàgina mestra (i així per a totes les pàgines que la fan servir): omple, encaixa, estira o mosaic, amb opacitat. Des de la barra de context, el menú **Pàgines** o **Insereix**, la pestanya **Propietats** sense res seleccionat o amb Maj+clic en una imatge del cistell de **Recursos** |
| Pages / Master pages | Afegir, duplicar, eliminar i reordenar pàgines; pàgines mestres amb nom; assignar-les a pàgines; numeració `{N}` / `{T}` |
| Text frames / Artistic text | Marcs amb columnes, marge interior, alineació vertical, indicador de desbordament i **Ajusta el text al marc**; text artístic que s'escala amb les nanses |
| Preset Text Path | **Trajectòria de text** per al text artístic (botó a la barra de context i a **Propietats**): línia, cercle, insígnia (línia 1 a dalt, línia 2 a baix), botó (dalt, centre i baix), cercle inferior, cercle superior, ona, trajectòria en C i C invertida. La caixa s'ajusta a la llargada del text; es pot redimensionar, girar, alinear (inici, centre, final) i editar amb doble clic. **Edició de la trajectòria**: en seleccionar el text es mostren el camí, els nodes i les fletxes d'inici i final del text; arrossegueu els nodes i les nanses (simètriques; `Alt` per separar-les) per canviar la forma, les fletxes per limitar on va el text, doble clic al camí per afegir un node i doble clic a un node per eliminar-lo. **Restableix la trajectòria** torna a la forma predefinida |
| Text properties & styles | Tipus de lletra, mida, negreta, cursiva, subratllat, color (també sobre text seleccionat), alineació, interlineat, espaiat, llistes de pics i numerades, estils de text (aplicar, crear, actualitzar, eliminar) |
| Convert text to table | Detecta tabuladors, `;`, `|` o `,` |
| Tables, Charts, Calendars | Taules editables, gràfics de barres, línies, àrees, sectors i anell (dades CSV) i calendaris mensuals amb esdeveniments |
| Pictures, PhotoLab, crop | Marcs d'imatge, arrossegar i deixar anar, enganxar des del porta-retalls, encaix i enquadrament (zoom i posició), filtres i ajustos predefinits |
| QR codes | Web/text, correu, telèfon, SMS i Wi-Fi, amb nivell de correcció d'errors |
| QuickShapes, lines | 12 formes (polígons i estrelles configurables), línies amb puntes de fletxa, traç continu, discontinu o puntejat |
| Shadow Tool / Filter effects | **Eina d'ombra** (`S`): arrossegueu sobre un objecte per crear i desplaçar l'ombra, `Maj+arrossegar` canvia el difuminat. Pestanya **Línia ▸ Ombra i resplendor**: ombra paral·lela, resplendor exterior i ombra interior, amb color, opacitat, difuminat i desplaçament, i predefinits (Suau, Marcada, Llarga, Resplendor, Interior). L'ombra manté la direcció encara que l'objecte giri |
| Color Picker | **Selector de color** (`P`): en passar per sobre de la pàgina o de la mesa de treball mostra el color i el seu codi; amb un clic l'aplica a la selecció (farciment, línia o text segons la pestanya **Color**; `Maj+clic`: a la línia). Sense selecció, el copia al porta-retalls. Els 10 últims colors recollits apareixen a la pestanya **Color** |
| Color, fills, transparency | Mostres, esquemes de color (els colors 1–5 es canvien a tota la publicació), degradats lineals i radials i opacitat |
| Double-click insert | **Doble clic en un lloc buit** (sense res seleccionat) insereix l'element predefinit en aquell punt: per defecte un **text artístic** a punt per escriure. Es pot canviar per un marc de text, una forma concreta, una taula, etc., o desactivar-ho a **Edita ▸ Element del doble clic…** o al menú del botó dret |
| Context menu | Clic dret (o pressió llarga a pantalles tàctils) sobre la pàgina o la mesa de treball sense res seleccionat: **Insereix aquí** qualsevol objecte de la barra d'eines (text artístic, marc de text, marc d'imatge, formes ràpides, línia, taula, gràfic, calendari, codi QR o imatge del disc) just on s'ha fet clic, a més d'enganxar, seleccionar-ho tot i les opcions de pàgina |
| Pasteboard | **Mesa de treball** comuna a totes les pàgines: els objectes que deixeu completament fora de la pàgina hi queden (no s'imprimeixen) i es veuen des de qualsevol pàgina. Arrossegueu-los a una pàgina per moure-l'hi o feu **Ctrl+arrossegar** per copiar-los-hi. Els objectes que sobresurten de la pàgina es mostren sencers a l'editor i es retallen en imprimir |
| Group / Ungroup | **Agrupa** (`Ctrl+G`) i **Desagrupa** (`Ctrl+Maj+G`), amb grups niats. El grup se selecciona, es mou, s'escala, es gira, s'inverteix, s'alinea i es copia com una unitat. `Ctrl+clic` selecciona un objecte dins del grup per editar-lo |
| Square Crop Tool | **Retall quadrat** (`C`): arrossegueu les nanses per amagar parts de qualsevol objecte (imatges, formes, text, taules…) i arrossegueu-ne l'interior per desplaçar el contingut dins del retall. El contorn taronja mostra l'objecte sencer. El retall es manté en girar, invertir o redimensionar l'objecte. Valors exactes a **Transforma ▸ Retall** i ordre **Treu el retall** |
| Convert to Picture | **Organitza ▸ Converteix en imatge…**: transforma un objecte, una selecció o un grup (amb ombres i transparències) en una imatge PNG de 96 a 600 ppp, al mateix lloc i a la mateixa capa. Opcionalment conserva els originals o descarrega el PNG. Si el navegador no permet generar el PNG, es crea una imatge SVG equivalent |
| Arrange / Align / Transform | Ordre, alinear, distribuir, girar, invertir, bloquejar, amagar, posició i mida exactes |
| Snapping, rulers, guides | Ajust a marges, columnes, guies, centre i objectes; regles en mm; guies que s'arrosseguen des de les regles; quadrícula |
| Tool feedback | La mida, la posició i l'angle es mostren mentre arrossegueu |
| Format Painter | Copia el format d'un objecte a un altre |
| Layers / Objects | Llista d'objectes amb noms, visibilitat i bloqueig |
| Assets | Cistell d'imatges, galeria de formes i «Els meus dissenys» reutilitzables (amb botons per canviar el nom i eliminar en passar el ratolí per sobre) |
| Preflight | Marcs buits, text desbordat, objectes fora de pàgina, resolució baixa, objectes amagats |
| Print / PDF / Preview | Previsualització d'impressió i impressió o «Desa com a PDF» del navegador amb la mida de pàgina correcta |
| Publish as web | Exporta una pàgina HTML autònoma (imatges incrustades) |

## Dreceres principals

`Ctrl+Z / Ctrl+Y` desfés i refés · `Ctrl+C / X / V / D` copia, retalla, enganxa i duplica · `Supr` elimina · `Ctrl+S` desa · `Ctrl+O` obre · `Ctrl+P` imprimeix · `Ctrl+B / I / U` format · `Ctrl+G / Ctrl+Maj+G` agrupa i desagrupa · `Ctrl+clic` selecciona dins d'un grup · `Ctrl+arrossegar` copia · `Ctrl+Alt+← / →` canvia de publicació · `Ctrl+Alt+W` tanca la publicació · `F2` edita el text · `Esc` acaba · fletxes per moure 0,5 mm (amb `Maj`, 5 mm) · `Ctrl+roda` o pessic per fer zoom · `V H T F I Q L S C P B G K R` per triar eines · `F1` mostra totes les dreceres.

## Limitacions conegudes

- El text no flueix d'un marc a un altre (marcs enllaçats) i no s'ajusta al voltant d'altres objectes. En canvi, el marc avisa quan el text no hi cap i es pot ajustar automàticament.
- El PDF es genera amb el diàleg d'impressió del navegador («Desa com a PDF»). No hi ha exportació ePub, PDF/X ni separació de colors CMYK.
- Els tipus de lletra són els que hi ha instal·lats al sistema.
- Els fitxers recents que s'han obert des del disc es reobren des d'una còpia guardada al navegador; si no hi cap, l'aplicació demana tornar a seleccionar el fitxer.
- `localStorage` té un límit d'uns 5 MB. Per a publicacions amb moltes imatges, feu servir el servidor o descarregueu el fitxer `.ppw`.
