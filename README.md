# PigeonTrack

Aplicatie PWA pentru evidenta porumbeilor voiajori: registru porumbei, concursuri, pedigree (arbore genealogic) si rapoarte exportabile in PDF. Functioneaza pe laptop si mobil, cu autentificare pe cont propriu si datele salvate in cloud (Cloudflare D1), accesibile de pe orice dispozitiv.

## Structura proiectului

```
functions/          Cloudflare Pages Functions (API-ul de backend, fara build step)
  _middleware.js     verifica sesiunea pentru orice /api/* (in afara de login/bootstrap)
  api/auth/          login, logout, creare cont initial (bootstrap), schimbare parola
  api/pigeons/       CRUD porumbei
  api/categories/    CRUD categorii (optionale)
  api/events/        CRUD concursuri + inscrieri porumbei (participants)
  api/settings/      preferinte aplicatie (tema, culori)
  api/reports/       date agregate pentru rapoarte
public/              tot ce e static: HTML/CSS/JS, iconite PWA, manifest, service worker
schema.sql           schema bazei de date D1 (SQLite)
tools/generate_icons.py  script folosit o singura data ca sa genereze iconitele din poza porumbelului
```

Nu exista niciun pas de build (fara Node/npm) - fisierele din `public/` sunt servite ca atare, iar `functions/` devine automat API-ul aplicatiei (rutare bazata pe nume de fisier).

## 1. Creeaza baza de date in Cloudflare (D1)

Ai nevoie de un cont Cloudflare (gratuit, fara card - D1 nu il cere). Pasii se fac din dashboard, fara linie de comanda.

1. In dashboard: **Workers & Pages → D1 → Create database**.
2. Nume sugerat: `pigeontrack-db`.
3. Dupa creare, intra in baza de date → tab **Console** → ruleaza pe rand comenzile din [`schema.sql`](schema.sql) (cate un `CREATE TABLE`/`CREATE INDEX` per rulare - caseta de comenzi din consola D1 se comporta mai bine asa decat cu tot fisierul deodata).

Pozele porumbeilor sunt salvate direct in aceasta baza de date (comprimate in browser inainte de salvare), asa ca nu e nevoie de R2 sau de alt serviciu de stocare - si deci nici de card asociat contului Cloudflare.

## 2. Publica proiectul pe Cloudflare Pages

1. In dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
2. Selecteaza repo-ul `PigeonTrack` de pe GitHub.
3. Setari de build:
   - **Build command**: (lasa gol)
   - **Build output directory**: `public`
4. Apasa **Save and Deploy**. Primul deploy va merge fara baza de date functionala - o legam la pasul urmator.

### 2.1. Leaga baza de date de proiect

In proiectul Pages nou creat → **Settings → Functions → D1 database bindings** → Add binding:
- Variable name: `DB`
- D1 database: `pigeontrack-db`

Dupa ce adaugi binding-ul, fa un **redeploy** (Deployments → ... → Retry deployment) ca sa se aplice.

## 3. Primul cont

Deschide URL-ul dat de Cloudflare Pages (ex: `pigeontrack.pages.dev`). Cum baza de date e goala, aplicatia te intampina cu un ecran de configurare unde iti creezi contul de utilizator (nume + parola). Dupa acest prim cont, ecranul de configurare se dezactiveaza automat si oricine acceseaza aplicatia trebuie sa se autentifice.

## 4. Domeniu propriu (optional)

In proiectul Pages → **Custom domains** → adauga un domeniu pe care il detii deja in Cloudflare, daca vrei o adresa proprie in loc de `*.pages.dev`.

## 5. Actualizari

Orice `git push` pe branch-ul principal redeclanseaza automat un deploy nou pe Cloudflare Pages - nu e nevoie de niciun pas manual in plus.

## Note tehnice

- **Poze**: fiecare poza e redimensionata si comprimata automat in browser (max ~1000px, sub ~260KB) si salvata direct in D1 impreuna cu restul datelor porumbelului - nu foloseste R2, deci nu necesita niciun card asociat contului Cloudflare.
- **Offline**: interfata (PWA) se instaleaza si porneste si fara internet datorita service worker-ului, dar datele (porumbei, concursuri) necesita conexiune - aplicatia e gandita pentru sincronizare live intre dispozitive, nu pentru lucru offline complet.
- **Rapoarte PDF**: generate direct in browser (biblioteca jsPDF, inclusa local in `public/js/vendor/`), fara niciun serviciu extern.
- **Securitate**: parolele sunt hash-uite (PBKDF2/SHA-256) si nu sunt niciodata stocate in clar; sesiunea se pastreaza printr-un cookie `HttpOnly`/`Secure`.
