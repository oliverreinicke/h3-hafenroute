# GTA – Gesundheit. Transport. Abenteuer.

V13 ist ein 3D-Lernspiel mit fünf fiktiven Transportmissionen für FaGe H3. Bedarf und Mitgaben klären, ein passendes Transportangebot prüfen, die Person abholen und persönlich übergeben. Alle Personen, Orte, Angebote und Kennzeichen sind fiktiv. Fahrten und Teamhandlungen sind Spielabstraktionen.

## Starten

Im Projektordner:

```sh
python3 -m http.server 8000 --directory dist
```

Danach [http://localhost:8000](http://localhost:8000) in einem aktuellen Browser mit WebGL2 öffnen. Alle 105 Modelle, Bilder und Audiodateien werden lokal mitgeliefert; zum Spielen sind weder Paketinstallation noch Sprachdienst nötig. Lehrmittellinks öffnen bei Auswahl Edubase.

## Steuerung und Spielstand

- Pfeiltasten: zu Fuss drehen und vor-/rückwärts gehen; im Fahrzeug lenken, Gas und Bremse/Rückwärtsfahrt.
- Nach zwei Sekunden tatsächlichem, ununterbrochenem Vorwärtsgehen wechselt die Figur automatisch ins Rennen. Loslassen, Rückwärtsgehen oder Pause setzt dies zurück. Shift sprintet sofort.
- Enter bestätigt die angezeigte Aktion. Dialogauswahl mit Pfeilen beziehungsweise Tab, Kästchen mit Leertaste.
- F einmal drücken: Das Fahrzeug bremst kontrolliert bis zum Stillstand; danach steigt die Figur aus beziehungsweise vom Scooter ab. Ist der Ausstieg tatsächlich blockiert, bleibt sie im Fahrzeug und erhält einen Hinweis.
- C richtet die Aussenkamera hinter dem Fahrzeug aus. M öffnet die Karte, J den Auftrag, Esc die Pause. Maus ziehen erlaubt kurzzeitiges Umschauen. WASD/E bleiben zusätzliche Eingaben; kleine Bildschirme bieten Bildschirmtasten.

Die Stadt enthält insgesamt 25 Autos, zwölf E-Scooter und 26 Passanten. Die fünf Transportangebote sind von den frei nutzbaren Stadt- und Verkehrsautos sowie Scootern getrennt. Ein fahrendes Verkehrsauto hält vor dem Einsteigen kontrolliert an. Personen aus den Lernfällen werden ausschliesslich mit dem konkret bestätigten Transportangebot übernommen. Die Scooter fahren höchstens 20 km/h. Fortschritt abgeschlossener Missionen bleibt im jeweiligen Browser gespeichert.

## Stimmen und Medien

Acht Sprachclips von Elena und Selma wurden in V13 mit neuer Regie aufgenommen. Die übrigen 59 Sprachclips bleiben erhalten; es handelt sich um synthetische Erwachsenenstimmen. Musik, Sprache und Fahrgeräusche sind getrennt regelbar. Bei nicht abspielbaren Clips steht eine Browserstimme als Rückfall bereit. Alle Audiodateien liegen lokal vor. Der Introtext einer Person wird pro Missionszustand automatisch einmal gesprochen und lässt sich bewusst wiederholen.

## Bauen und prüfen

Python 3 und für die Tests Node.js (empfohlen ab Version 20) genügen. Kein Paketmanager ist erforderlich:

```sh
python3 build.py
node tests/rules.test.mjs
node tests/autorun-v13.test.mjs
node tests/mobility-v13.test.mjs
```

Der Build erzeugt `dist/index.html` und zusätzlich die grosse optionale Einzeldatei `Hafenroute_H3.html` im Projektordner. Diese Einzeldatei ist nicht Teil des Repository-Pakets. Weitere portable Prüfungen liegen in `tests/`, der Audiotest in `Entwicklung/audio.test.mjs`. Tests mit Three.js-CPU-Mathematik ersetzen keine Sicht-, Hör- oder GPU-Prüfung auf jedem Endgerät. Die Echtzeitgrafik und Bildrate sind geräte- und szenenabhängig.

## Rechte

Herkunft und Lizenzen stehen in [ASSET-LICENSES.txt](ASSET-LICENSES.txt), [Three.js MIT](dist/vendor/LICENSE-Three.txt) und [Sketchbook MIT](vendor/LICENSE-Sketchbook.txt). Für eigene Projektbestandteile wird mit dieser Bereitstellung keine zusätzliche offene Lizenz vergeben; siehe [COPYRIGHT.txt](COPYRIGHT.txt). Keine kommerziellen GTA-Assets enthalten.

Dieses Paket enthält ausschliesslich die aktuelle Spielversion, lokale Ressourcen und portable Tests. Frühere Spiele, interne Prüfberichte, Synthesepläne, Generatoren, Backups, Hosting-Konfiguration und Git-Historie sind nicht enthalten. Kleine bereinigte Daten unter `tests/fixtures/` halten historische Regressionserwartungen ohne interne Pfade reproduzierbar.
