# PigeonTrack

Aplicatie PWA pentru evidenta porumbeilor voiajori: registru porumbei, concursuri, pedigree (arbore genealogic) si rapoarte exportabile in PDF. Functioneaza pe laptop si mobil, cu autentificare pe cont propriu si datele salvate in cloud (Cloudflare D1 + R2), accesibile de pe orice dispozitiv.

## Structura proiectului

```
functions/          Cloudflare Pages Functions (API-ul de backend, fara build step)
  _middleware.js     verifica sesiunea pentru orice /api/* (in afara de login/bootstrap)
  api/auth/          login, logout, creare cont initial (bootstrap), schimbare parola
  api/pigeons/       CRUD porumbei
  api/categories/    CRUD categorii (optionale)
  api/events/        CRUD concursuri + inscrieri porumbei (participants)
  api/photos/        upload si servire poze (stocate in R2)
  api/settings/      preferinte aplicatie (tema, culori)
  api/reports/       date agregate pentru rapoarte
public/              tot ce e static: HTML/CSS/JS, iconite PWA, manifest, service worker
schema.sql           schema bazei de date D1 (SQLite)
tools/generate_icons.py  script folosit o singura data ca sa genereze iconitele din poza porumbelului
```

Nu exista niciun pas de build (fara Node/npm) - fisierele din `public/` sunt servite ca atare, iar `functions/` devine automat API-ul aplicatiei (rutare bazata pe nume de fisier).

## 1. Creeaza resursele in Cloudflare

Ai nevoie de un cont Cloudflare (gratuit). Toti pasii de mai jos se fac din dashboard, fara linie de comanda.

### 1.1. Baza de date (D1)

1. In dashboard: **Workers & Pages → D1 → Create database**.
2. Nume sugerat: `pigeontrack-db`.
3. Dupa creare, intra in baza de date → tab **Console** → lipeste tot continutul fisierului [`schema.sql`](schema.sql) → ruleaza. Asta creeaza toate tabelele.

### 1.2. Stocare poze (R2)

1. In dashboard: **R2 → Create bucket**.
2. Nume sugerat: `pigeontrack-photos`.
3. Nu trebuie facut public - aplicatia serveste pozele printr-un API propriu, protejat de login.

## 2. Publica proiectul pe Cloudflare Pages

1. In dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
2. Selecteaza repo-ul `PigeonTrack` de pe GitHub.
3. Setari de build:
   - **Build command**: (lasa gol)
   - **Build output directory**: `public`
4. Apasa **Save and Deploy**. Primul deploy va merge fara baza de date/poze functionale - le legam la pasul urmator.

### 2.1. Leaga baza de date si bucket-ul de proiect

In proiectul Pages nou creat → **Settings → Functions**:

- **D1 database bindings** → Add binding:
  - Variable name: `DB`
  - D1 database: `pigeontrack-db`
- **R2 bucket bindings** → Add binding:
  - Variable name: `PHOTOS`
  - R2 bucket: `pigeontrack-photos`

Dupa ce adaugi bindings, fa un **redeploy** (Deployments → ... → Retry deployment) ca sa se aplice.

## 3. Primul cont

Deschide URL-ul dat de Cloudflare Pages (ex: `pigeontrack.pages.dev`). Cum baza de date e goala, aplicatia te intampina cu un ecran de configurare unde iti creezi contul de utilizator (nume + parola). Dupa acest prim cont, ecranul de configurare se dezactiveaza automat si oricine acceseaza aplicatia trebuie sa se autentifice.

## 4. Domeniu propriu (optional)

In proiectul Pages → **Custom domains** → adauga un domeniu pe care il detii deja in Cloudflare, daca vrei o adresa proprie in loc de `*.pages.dev`.

## 5. Actualizari

Orice `git push` pe branch-ul principal redeclanseaza automat un deploy nou pe Cloudflare Pages - nu e nevoie de niciun pas manual in plus.

## Note tehnice

- **Poze**: fiecare poza e redimensionata si comprimata automat in browser inainte de upload (max ~1600px, sub ~6.5MB), ca sa nu incarce baza de date/bucket-ul cu fisiere uriase.
- **Offline**: interfata (PWA) se instaleaza si porneste si fara internet datorita service worker-ului, dar datele (porumbei, concursuri) necesita conexiune - aplicatia e gandita pentru sincronizare live intre dispozitive, nu pentru lucru offline complet.
- **Rapoarte PDF**: generate direct in browser (biblioteca jsPDF, inclusa local in `public/js/vendor/`), fara niciun serviciu extern.
- **Securitate**: parolele sunt hash-uite (PBKDF2/SHA-256) si nu sunt niciodata stocate in clar; sesiunea se pastreaza printr-un cookie `HttpOnly`/`Secure`.
