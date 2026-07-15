# PickIt – AI agent útmutató

Közös bevásárlólista-alkalmazás családoknak. A felhasználók listát állítanak össze, vásárlás közben bejelölik a megvásárolt tételeket, a családtagok **valós időben** látják egymás állapotát, és a korábban használt tételek katalógusból gyorsan újra felhasználhatók.

## Expo és dokumentáció

**Expo SDK 54** van telepítve (`expo ~54.0.0`). Kód írása előtt olvasd el a verzióhoz illő dokumentációt:

https://docs.expo.dev/versions/v54.0.0/

Ne használj elavult vagy újabb SDK-s mintákat anélkül, hogy szándékosan frissítenénk a projektet.

## Tech stack

| Réteg | Technológia |
|-------|-------------|
| Mobil | Expo (React Native) + TypeScript, expo-router |
| Backend | Firebase Auth + Firestore |
| Push | Expo Notifications + Firebase Cloud Functions |
| Hibakövetés | Sentry (`@sentry/react-native`) |
| Build | EAS Build / Submit |
| Hosting | Firebase Hosting (adatvédelmi oldalak) |

**Miért Firebase, nem Supabase?** A valós idejű Firestore-szinkron, az anonim + e-mail auth, és a meghívó kódos családi megosztás egyszerűen megoldható Firebase-sel; ez volt az induló döntés.

## Alkalmazás-azonosítók

- **Bundle ID / package:** `hu.pickit.app` (a `com.pickit.app` nem volt elérhető)
- **EAS project ID:** `b4dfe696-2f33-42f8-83ac-d851ffd42913`
- **Expo owner:** `jattila`
- **GitHub:** `github.com/jattila/pickit`

Az azonosítót **az első store build előtt** kell véglegesíteni; utólag nehezebb.

## Projektstruktúra

```
app/                      expo-router képernyők
  _layout.tsx             provider-ek + auth gate
  index.tsx               átirányítás (login / setup / app)
  login.tsx, setup.tsx, suspended.tsx
  (tabs)/                 listák, katalógus, beállítások
  list/[id].tsx           lista részletei
src/
  config/                 firebase, sentry
  context/                Auth, Locale, FontScale, Network, Menu
  lib/                    firestore CRUD, push, household, itemName
  components/             UI, modálok, KeyboardAwareScrollView
  i18n/locales/           hu (alap), en, de
  theme/                  színek, fontScale, useScaledStyleSheet
functions/                Cloud Functions (push debounce)
firestore.rules           biztonsági szabályok
public/                   adatvédelmi oldalak (Firebase Hosting)
```

## Adatmodell (Firestore)

```
users/{uid}                          { displayName, householdId, fontScaleLevel, ... }
inviteCodes/{KÓD}                     { householdId }
households/{householdId}             { name, inviteCode, memberIds, members, ... }
  lists/{listId}                     { name, archived, itemCount, checkedCount }
    items/{itemId}                   { name, quantity, checked, checkedBy, favorite, ... }
  catalog/{catalogId}                { name, useCount, lastUsedAt, favorite }
  activity/{id}                      push batch trigger
  pushBatchQueue/{id}                debounced push queue
```

## Biztonsági szabályok – fontos döntések

1. **`inviteCodes` gyűjtemény:** A meghívó kód feloldása külön collectionben történik, hogy a `households` dokumentumot **ne olvashassa bárki** bejelentkezés után.
2. **Mezőszintű validáció:** Kötelező mezők, típusok, hossz-limitek. Tétel bejelölésnél a `checkedBy` **kötelezően a saját uid**.
3. **Csatlakozás:** Új tag csak **saját magát** adhatja a `memberIds`-hez; a `createdBy`, `inviteCode`, `name` nem módosítható.
4. **App Check (HÁTRALÉVŐ):** Play Integrity / App Attest natív buildet igényel; Expo Go-ban nem működik. Részletek a README-ben.

## Auth és felhasználói folyamatok

- **Vendég (anonim)** gyors kezdéshez + **e-mail/jelszó** regisztráció több eszközhöz.
- Vendég fiók **utólag összekapcsolható** e-maillel (adatok megmaradnak).
- E-mail megerősítés után **ne kelljen ki/be jelentkezni** – az auth state frissüljön automatikusan.
- Regisztráció után jelezd: *„Nézd meg a levélszemét mappát is”* (VerifyEmailBanner).
- Nem megerősített e-mail esetén korlátozott funkciók (pl. családhoz csatlakozás).
- Jelszó mezőn **szem ikon** (mutatás/elrejtés), alapból rejtve.
- Sikeres bejelentkezésnél **gombon pörgő indikátor**, ne teljes üres képernyő.

## Család és tagkezelés

- Meghívó kóddal csatlakozás.
- Tag **felfüggesztése / újraaktiválása** (nem végleges törlés) – admin nem ismeri a jelszót.
- Ha **két azonos nevű tag** van, **mindkettőnél** jelenjen meg halványan az e-mail zárójelben.

## UI/UX preferenciák (felhasználói döntések)

### Navigáció
- **Hamburger menü** (SideMenu) a tab navigáció mellett; a menü fejlécében a **PickIt ikon**, ne kosár ikon.
- A meglévő tab struktúra maradjon (Listák / Katalógus / Beállítások).

### Tételek és katalógus
- Tételnevek **kisbetűvel kezdődnek** (`normalizeItemName`, `formatItemNameInput`).
- Katalógus **ABC sorrendben**; kedvencek **elöl**, azon belül ABC.
- Bevásárlólistában: kedvencek elöl, **hozzáadás sorrendje** számít a többi között.
- **Kedvencelés** csillag ikonnal (lista + katalógus).
- **Szerkesztés:** apró, halvány ceruza ikon mindkét helyen; hosszú tap menü is működjön.
- **Autókiegészítés** gépeléskor a katalógusból; ne kelljen végiggépelni.
- **Mennyiség parsing:** „4 db fokhagyma”, „fokhagyma 4 db”, „4 fokhagyma” → darabszám külön mezőbe.
- A katalógus **ne jegyezze meg** az utolsó darabszámot alapértelmezettként.
- Ha egy tétel **már be van jelölve** a listában, a katalógusból **ne lehessen újra hozzáadni**.
- Katalógus szerkesztése szinkronban frissítse a listában lévő tételeket is (azonos névnél).
- **Ne mutass** useCount számlálót a katalógusban.

### Beállítások
- **Betűméret** nagyítás/kicsinyítés, **felhasználónként** tárolva (Firestore + FontScaleContext).
- **Nyelvváltás:** magyar (alap), angol, német – LocaleContext + `src/i18n/locales/`.

### Billentyűzet / Android (kritikus!)
- Androidon a billentyűzet **eltakarja** a beviteli mezőket – ez visszatérő probléma.
- Használd a meglévő `KeyboardAwareScrollView`, `KeyboardAwareModalScroll`, `useKeyboardHeight` hookokat.
- **Ne törj el iOS viselkedést** Android javításkor – mindkét platformon tesztelendő.
- `app.json`: Android `softwareKeyboardLayoutMode: "resize"`.
- Modáloknál legyen **egyenletes padding** felül és alul.

## Offline támogatás

- Firestore persistence + NetworkContext + OfflineBanner.
- Offline módban is működjön a hozzáadás; szinkron visszakapcsoláskor figyelj a konfliktusokra.
- `.env` módosítás után **indítsd újra** a dev servert.

## Push értesítések

- **3 perces debounce** – összefoglaló üzenet, ne minden koppintásra külön.
- A módosító **nem kap** értesítést a saját változásairól.
- **Expo Go-ban nem működik** – EAS build kell (preview/production).
- Cloud Functions: `firebase deploy --only firestore:rules,functions`
- Szükséges: `EXPO_ACCESS_TOKEN` secret, Firestore index a `pushBatchQueue`-hoz.
- Push token regisztráció: `PushNotificationRegistrar` + Beállítások kapcsoló.

## Fejlesztői környezet

```bash
npm install
npm start              # LAN mód (ugyanazon Wi-Fi)
npm run start:remote   # ngrok tunnel (NGROK_AUTHTOKEN a .env-ben) – AJÁNLOTT távolról
npm run start:tunnel   # Expo beépített tunnel – gyakran timeout
```

- **Távolról tesztelés:** `npm run start:remote` megbízhatóbb, mint `start:tunnel` (ngrok timeout hiba).
- Alternatíva: **Tailscale** (virtuális LAN, tunnel nélkül).
- Expo Go iOS 4.9 → SDK 54.0.2-ig támogatott.
- Ha „már fut az alkalmazás”: `lsof -ti:8081 | xargs kill` vagy más port.
- Cache törlés (`--clear`) **nem törli** a Firestore auth/session állapotot – ez normális.

## Környezeti változók

`.env.example` → `.env` (soha ne commitold):

- `EXPO_PUBLIC_FIREBASE_*` (6 db)
- `EXPO_PUBLIC_SENTRY_DSN`
- `NGROK_AUTHTOKEN` (opcionális, remote dev-hez)

EAS buildhez: `eas env:create` minden `EXPO_PUBLIC_*` változóra (preview + production).

## Build és store

```bash
npm run eas:build:android       # preview APK
npm run eas:build:android:store # production → Play Store
npm run eas:build:ios           # preview (TestFlight / internal)
npm run eas:build:ios:store     # production → App Store
npm run eas:submit:android
npm run eas:submit:ios
```

- **EAS** = Expo Application Services (build, submit, env, secrets).
- Tanúsítványokat az **EAS kezeli** automatikusan (credentials).
- Android tesztelőknek: Play Console **Internal/Alpha track** (profibb), vagy APK link.
- Adatvédelmi tájékoztató: `public/privacy.html` (HU), `public/privacy-en.html` (EN), Firebase Hosting.

## Firebase beállítás (új környezethez)

1. Authentication: **Anonymous** + **Email/Password** (Sign-in method fül).
2. Firestore Database létrehozása (production mode + rules deploy).
3. Web app regisztráció → config a `.env`-be.
4. Google Developer Program / Gemini / Analytics **nem kötelező** a projekt indulásakor.

## Kódolási konvenciók

- **Minimális diff** – csak a kért változtatást csináld.
- **Meglévő minták** – olvasd a környező kódot (context-ek, `src/lib/firestore.ts`, `src/components/ui.tsx`).
- **i18n:** minden felhasználói szöveg a locale fájlokban (`hu.ts`, `en.ts`, `de.ts`), ne hardcode-olj.
- **Típusok:** `src/types/index.ts`.
- **Firestore írások:** `src/lib/firestore.ts`-en keresztül; batch műveleteknél `deleteField()` csak `{ merge: true }`-val.
- **Tételek:** `src/lib/itemName.ts` parsing/normalizálás logikája.
- **Stílus:** `useScaledStyleSheet` a betűméret-skálázáshoz.
- **Kommentek:** csak nem-nyilvánvaló üzleti logikához.

## Admin / diagnosztika

- `functions/scripts/list-users-activity.js` – felhasználók, e-mailek, tevékenység listázása (Admin SDK, service account kell).
- `functions/scripts/check-push-state.js` – push állapot ellenőrzés.
- Service account: `GOOGLE_APPLICATION_CREDENTIALS` env vagy `firebase login` + megfelelő jogosultság.

## Skálázás – mire figyelj

- Firestore olvasás/írás kvóták (valós idejű listener-ek minden listán).
- Cloud Functions cold start + push batch queue.
- Expo push rate limit.
- Családonként növekvő katalógus/lista méret → indexek, pagination később.
- App Check enforcement bekapcsolása élesben.

## Amit NE csinálj

- Ne commitolj `.env`, service account kulcsot, `SENTRY_AUTH_TOKEN`-t.
- Ne nyisd ki a `households` olvasását nem tagoknak (használd az `inviteCodes`-t).
- Ne tárolj darabszámot a katalógusban alapértelmezettként.
- Ne töröld az archiválás funkciót – a felhasználó kérte, de kérdés volt róla; ha módosítod, egyeztess.
- Ne használj Expo Go-specifikus push tesztet – EAS build kell.
- Ne frissítsd az Expo SDK-t csendben – ez breaking change lehet.

## Állapot (2026. július)

### Kész
- Alap app (listák, katalógus, család, valós idejű szinkron)
- Production Firestore rules + inviteCodes
- Offline támogatás
- i18n (HU/EN/DE), betűméret, kedvencek, hamburger menü
- Sentry integráció
- Push értesítések (Cloud Functions)
- Tag felfüggesztés, e-mail megjelenítés dupla neveknél
- EAS build/submit, Play Store + App Store feltöltés
- Adatvédelmi oldalak + Firebase Hosting

### Hátralévő / opcionális
- **App Check** (natív build + `@react-native-firebase/app-check`)
- App Check enforcement éles Firestore-on
- További skálázási optimalizációk (pagination, cache)

## Hasznos parancsok

```bash
firebase deploy --only firestore:rules,functions,hosting
npm run start:clear          # cache törléssel
npx expo-doctor              # Expo kompatibilitás ellenőrzés
```

Részletes telepítési és build útmutató: `README.md`.
