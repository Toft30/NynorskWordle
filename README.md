# Ordleik – dagens nynorske ord

Eit dagleg ordspel: gjett dagens nynorske ord på fem bokstavar på seks forsøk.
Alle orda kjem frå [Nynorskordboka](https://ordbokene.no) (Språkrådet og Universitetet i Bergen).

## Filer

- `index.html`, `stil.css`, `spel.js` – sjølve spelet (rein HTML/CSS/JS, ingen avhengigheiter)
- `ordliste.js` – generert ordliste (`SVAR` = moglege dagens ord, `GYLDIGE` = godkjende gjettingar)
- `verktoy/lag-ordliste.js` – hentar oppslagsorda frå ord.uib.no og lagar `ordliste.js` på nytt

## Køyre lokalt

```bash
py -m http.server 8080
```

Opne så <http://localhost:8080>.

## Oppdatere ordlista

```bash
node verktoy/lag-ordliste.js
```

Merk: rekkjefølgja på dagens ord kjem frå ei fast stokking av `SVAR`. Endrar du lista, endrar du òg kva ord som kjem kvar dag.
