# PickIt 🛒

Közös bevásárlólista-alkalmazás családoknak. Állítsd össze a listát, vásárlás
közben jelöld be a betett tételeket, és a családtagok **valós időben** látják,
ki mit vásárolt már meg. A korábban használt tételek automatikusan elmentődnek,
így a következő listát pár koppintással össze tudod válogatni – nem kell
mindent újra begépelni.

Készült: **Expo (React Native + TypeScript)** + **Firebase (Auth + Firestore)**.

## Fő funkciók

- 📝 Több bevásárlólista létrehozása, szerkesztése, archiválása, törlése
- ✅ Tételek bejelölése vásárlás közben, áthúzott „Megvásárolva" szekcióval
- 🔄 **Valós idejű szinkron** – ha az egyik családtag bejelöl egy tételt, a
  többiek azonnal látják, ki és mit vett már meg
- 🗂️ **Korábbi tételek katalógusa** – a használt tételek mentődnek, gyakoriság
  szerint rendezve, és többszörös kijelöléssel gyorsan listához adhatók
- 👨‍👩‍👧 **Családi megosztás** meghívó kóddal
- 🚀 Gyors kezdés vendégként (e-mail nélkül) vagy regisztráció e-maillel
- 🔐 Vendég fiók **utólagos összekapcsolása** e-maillel (az adatok megtartásával),
  e-mail megerősítés és jelszó-visszaállítás

## Előfeltételek

- Node.js 18+ (ajánlott 20/22)
- Egy mobil az **Expo Go** alkalmazással (App Store / Play Store), vagy iOS
  szimulátor / Android emulátor
- Egy ingyenes Firebase projekt

## 1. Firebase beállítása

1. Nyisd meg a [Firebase Console](https://console.firebase.google.com)-t, és
   hozz létre egy új projektet.
2. **Authentication → Get started → Sign-in method**: engedélyezd az
   **Anonymous** és az **Email/Password** szolgáltatókat.
3. **Firestore Database → Create database** (kezdetnek „test mode" is jó, de
   éleshez állítsd be a szabályokat – lásd lentebb).
4. **Project settings (⚙️) → General → Your apps → Web (</>)**: regisztrálj egy
   web alkalmazást, és másold ki a `firebaseConfig` értékeit.
5. A biztonsági szabályokhoz: **Firestore Database → Rules**, illeszd be a
   repó `firestore.rules` fájljának tartalmát, majd **Publish**.

## 2. Környezeti változók

Másold a `.env.example` fájlt `.env` néven, és töltsd ki a Firebase configból:

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=projekted.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=projekted
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=projekted.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

> A `.env` változtatása után **indítsd újra** a fejlesztői szervert.

## 3. Telepítés és futtatás

```bash
npm install
npm start
```

Ezután:

- Olvasd be a QR-kódot az **Expo Go** appal (telefon), vagy
- nyomj `i`-t iOS szimulátorhoz, `a`-t Android emulátorhoz.

## Használat

1. **Gyors kezdés**: add meg a neved → indulhat (vendég fiók), vagy regisztrálj
   e-maillel, hogy több eszközről is elérd a listáidat.
2. **Család**: hozz létre egy új családot, vagy csatlakozz egy meghívó kóddal.
3. A **Beállítások** fülön oszd meg a meghívó kódot a családtagjaiddal.
4. Hozz létre listát, adj hozzá tételeket (a „db" mezőbe írhatsz mennyiséget).
5. Vásárláskor koppints egy tételre a bejelöléshez – mindenki azonnal látja.
6. A 🗂️ gombbal válogass a korábban használt tételekből.

## Projektszerkezet

```
app/                      expo-router képernyők
  _layout.tsx             gyökér: provider-ek + auth gate
  index.tsx               átirányítás (login / setup / app)
  login.tsx               bejelentkezés / regisztráció
  setup.tsx               család létrehozása / csatlakozás
  (tabs)/                 fő fülek
    index.tsx             listák áttekintése
    catalog.tsx           korábbi tételek katalógusa
    settings.tsx          család, meghívó kód, tagok
  list/[id].tsx           lista részletei + vásárlás mód
src/
  config/firebase.ts      Firebase inicializálás
  context/AuthContext.tsx auth + profil + háztartás állapot
  lib/firestore.ts        Firestore CRUD + valós idejű feliratkozások
  components/             újrahasználható UI elemek
  types/                  TypeScript típusok
  theme/                  színek, térközök
firestore.rules           Firestore biztonsági szabályok
```

## Adatmodell (Firestore)

```
users/{uid}                          { displayName, householdId }
inviteCodes/{KÓD}                     { householdId }
households/{householdId}             { name, inviteCode, memberIds, members }
  lists/{listId}                     { name, archived, itemCount, checkedCount }
    items/{itemId}                   { name, quantity, checked, checkedByName, ... }
  catalog/{catalogId}                { name, useCount, lastUsedAt }
```

## Biztonsági szabályok

A `firestore.rules` szigorú, production-kész szabályokat tartalmaz:

- **users**: mindenki csak a saját profilját olvashatja/írhatja.
- **inviteCodes**: bármely bejelentkezett user olvashatja (ez kell a meghívó
  kóddal való csatlakozáshoz), de csak a háztartás azonosítóját tárolja –
  semmi érzékeny adatot. Létrehozni/módosítani csak a háztartás tagja tud.
- **households**: kizárólag a tagok olvashatják/írhatják. Csatlakozáskor egy új
  user **csak saját magát** adhatja a tagok listájához, a kulcsmezők
  (`createdBy`, `inviteCode`, `name`) nem módosíthatók.
- **lists / items / catalog**: csak a háztartás tagjai érik el, **mezőszintű
  validációval** – kötelező mezők, helyes típusok és hossz-limitek (pl. a tétel
  neve 1–100 karakter). Tétel bejelölésekor a `checkedBy` **kötelezően a saját
  uid** lehet, így nem lehet más nevében bejelölni.

A meghívó kódot tehát egy külön `inviteCodes` gyűjtemény oldja fel, így a
`households` dokumentum már nem olvasható nem-tagok számára.

## Éles build és terjesztés (EAS)

Az Expo Go csak fejlesztésre való. Store-ba tölthető (vagy telefonra
telepíthető) buildhez az **EAS Build** kell. A projekt már elő van készítve:
`app.json` (alkalmazás-azonosítók, ikon, splash) és `eas.json` (build profilok)
készen van.

> Alkalmazás-azonosító: jelenleg `com.pickit.app` (iOS `bundleIdentifier` és
> Android `package`). Ha sajátot szeretnél, **az első build előtt** írd át az
> `app.json`-ban.

### Előfeltételek

- Ingyenes [Expo](https://expo.dev) fiók
- `eas-cli` (vagy futtasd `npx eas-cli@latest`-tel)

```bash
npm install -g eas-cli
eas login
eas init        # összekapcsolja a projektet, beírja az extra.eas.projectId-t
```

### Firebase env változók a buildhez

A `.env` nem kerül fel az EAS szerverekre (a `.gitignore` kizárja), ezért a
Firebase configot **EAS környezeti változókként** kell megadni. Mivel ezek
`EXPO_PUBLIC_` előtagúak (a kliensbe amúgy is beépülnek), `plaintext`
láthatósággal add meg őket – minden értéket a `preview` és `production`
környezethez is:

```bash
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIza..." --environment production --visibility plaintext
# ...és így tovább mind a 6 változóra, production és preview környezethez
```

(Vagy egyszerűbben az Expo dashboardon: Project → Environment variables.)

### Build és feltöltés

```bash
# Teszt build (Android APK telefonra, vagy belső iOS):
eas build -p android --profile preview
eas build -p ios --profile preview

# Éles build:
eas build -p android --profile production
eas build -p ios --profile production

# Feltöltés a store-okba (Apple Developer / Google Play fiók kell):
eas submit -p android --latest
eas submit -p ios --latest
```

Store-fiókok: **Apple Developer Program** (99 USD/év) és **Google Play Console**
(25 USD egyszeri).

## App Check (b) pont – még hátravan)

Az App Check biztosítja, hogy **csak a hivatalos appodból** érkező kérések érjék
el a Firestore-t (a lemásolt API-kulcsos botok ne). Ez a Firebase **JS SDK**-val
és Expo Go-ban **nem** működik, mert natív attesztáció kell (App Attest /
Play Integrity). A javasolt út:

1. Készíts egy natív **dev buildet**:
   ```bash
   npx expo install expo-dev-client
   eas build -p ios --profile development   # vagy -p android
   ```
   Ezután a fejlesztői szervert így indítsd: `npx expo start --dev-client`.
2. Tedd át a Firebase elérést `@react-native-firebase/app`-re (vagy egészítsd ki
   azzal) és add hozzá a `@react-native-firebase/app-check` modult.
3. A Firebase Console → **App Check** alatt regisztráld az appot az
   **App Attest** (iOS) és **Play Integrity** (Android) providerrel.
4. Kapcsold be az **enforcement**-et a Firestore-ra.

> Amíg ez nincs kész, részleges védelmet ad a Firebase Console →
> Authentication → Settings alatti **abuse protection**, és a használati kvóták
> figyelése.
