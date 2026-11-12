<div align="center">

<img src="src/assets/favicon.svg" width="104" alt="">

# GIFbit

**Animacje, które trafiają w rytm.**<br>
Wybierz GIF-y, włącz muzykę i zamień ekran w pokaz sterowany uderzeniami.

![HTML · CSS · JavaScript](https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-342c41)
![Statyczna aplikacja](https://img.shields.io/badge/deploy-statyczny-ff6b3d)
![W przeglądarce](https://img.shields.io/badge/dzia%C5%82a-w%20przegl%C4%85darce-342c41)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-342c41)](#github-pages)

**[Szybki start](#szybki-start)** ·
**[Funkcje](#funkcje)** ·
**[Banki GIF-ów](#banki-gif-ów)** ·
**[Jeden HTML](#jeden-plik-html)** ·
**[GitHub Pages](#github-pages)** ·
**[Dokumentacja](#organizacja-kodu)**

<br>

<img src="https://i.imgur.com/OJO2YLg.png" width="900" alt="GIFbit: kolaż animacji, panel kolorów po prawej i miernik uderzeń w lewym dolnym rogu.">

</div>

## Po co GIFbit

Prosta aplikacja do wizualizacji muzyki: mikrofon wykrywa uderzenia, a na ekranie pojawiają się animacje z GIPHY. Można też sterować pokazem ręcznie, bez mikrofonu. Aplikacja działa w przeglądarce, bez backendu i frameworka. Krótki build przygotowuje statyczny katalog `dist/` do publikacji; źródła można uruchamiać bez budowania.

## Od muzyki do pokazu

Po [uruchomieniu aplikacji](#szybki-start) wystarczą cztery kroki:

1. Kliknij **Browse GIF banks**, otwórz bank i wybierz **Import animations**. Możesz zaznaczyć wszystkie animacje albo wybrane. Nie potrzebujesz klucza GIPHY. Własny plik JSON można też wczytać przez **Saved set → Import from file**.
2. Wybierz **Review animations**, aby przejrzeć i ograniczyć zestaw, albo od razu **Start without microphone**.
3. Naciśnij **Spację** lub kliknij scenę, aby wywołać uderzenie i wyświetlić animację.
4. Wybierz **Start** i zezwól na mikrofon, aby pokaz reagował na muzykę z głośników. Dostęp do mikrofonu wymaga HTTPS lub localhost.

## Funkcje

<table>
<tr>
<td width="50%" valign="top">

### Animacje z GIPHY

Wyszukuj według maksymalnie **10 słów lub fraz**, oddzielanych przecinkami, średnikami albo nowymi liniami. Powtórzone frazy są pomijane. Wybierz GIF-y, naklejki z przezroczystym tłem albo oba typy. Filtr treści PG-13 można wyłączyć.

Własny klucz GIPHY wpisujesz w ustawieniach. Limity zależą od planu API; wyszukiwanie używa jednego zapytania na frazę i typ animacji. Wyświetlanie wczytanych wyników nie wykonuje kolejnych zapytań wyszukiwania.

### Zestawy po swojemu

W **Review animations** klikaj lub przeciągaj animacje między **On screen** i **Put aside**. Filtruj po frazach, zmieniaj rozmiar miniaturek i przenoś wszystkie widoczne elementy jednocześnie. **Shuffle** zmienia kolejność listy, a **Add from set** dołącza inny zestaw lub plik JSON bez duplikowania identyfikatorów.

**Save as set** zapisuje aktywne animacje; istniejąca nazwa aktualizuje zestaw. Importuj wiele plików, eksportuj jeden zestaw lub wszystkie i usuwaj zestawy po ponownym kliknięciu potwierdzenia. Format `gifbit: 1` obsługuje pojedynczy zestaw, tablicę albo obiekt z tablicą `sets`.

Przykładowy bank **gif-banks/2026-11-05-hh3.json** zawiera niezmienione 255 animacji z pierwotnej próbki. Zestawy zawierają linki HTTPS do obrazów, więc odtwarzanie wymaga internetu.

### Banki społeczności

Przeglądaj banki opublikowane w repozytorium, wyszukuj je po nazwie i opisie, a ulubione **całe banki** oznaczaj gwiazdką. Po otwarciu banku zobaczysz jego opis i animowane miniatury. Zaimportuj całość lub zaznaczone GIF-y do własnych zestawów.

Eksport otwiera formularz **Name** i **Description**. Metadane są zapisywane w JSON, a nazwa pliku zawiera datę, np. `2026-11-12-neon-city.json`.

### Sterowanie podczas pokazu

**Spacja lub kliknięcie sceny** wywołuje ręczne uderzenie, także bez mikrofonu. Skróty otwierają ustawienia, panel kolorów, miernik i pełny ekran oraz pozwalają wystukiwać tempo i czyścić scenę.

Przyciski chowają się automatycznie. Aplikacja korzysta z blokady wygaszania ekranu, jeśli przeglądarka ją obsługuje. Ustawienia, zestawy i odłożone animacje są zapamiętywane lokalnie na kolejną sesję.

</td>
<td width="50%" valign="top">

### Rytm i mikrofon

Wybierz **Kick** (30–150 Hz), **Snare** (200–6000 Hz) lub **Everything** (30–16000 Hz), czułość 1–10 i zmianę animacji co 1, 2 lub 4 uderzenia.

Bez BPM aplikacja reaguje na wykryte uderzenia. Z opcjonalnym tempem **50–220 BPM** dopasowuje siatkę i przewiduje powtarzający się wzór; nowe uderzenia i przejścia nadal obsługuje na bieżąco. Tempo wpisujesz albo wystukujesz przyciskiem **Tap**: po czterech stuknięciach jest wyliczane, a dłuższa przerwa rozpoczyna pomiar od nowa.

Ogranicz zmiany GIF-ów do **1/32, 1/16, 1/8 lub 1/4 nuty** — szybsze uderzenia nadal wprawiają obraz w ruch. Ekran **Calibrate** dopasowuje wyprzedzenie obrazu w zakresie **0–250 ms**. Miernik pokazuje poziom sygnału, próg detekcji oraz status synchronizacji i przewidywania.

Detekcja działa w `AudioWorklet`, ze ścieżką zapasową `ScriptProcessor`. Audio jest analizowane lokalnie, bez nagrywania i wysyłania na serwer. Opuszczenie strony zwalnia mikrofon.

### Scena na cały ekran

Wyświetlaj **kolaż od 1 do 12 animacji** albo pojedynczą animację na całym ekranie. Wybierz losową kolejność lub **In order**, zgodnie z listą. Obrazy są wstępnie ładowane i dekodowane; wolniejsze pobieranie nie zmienia kolejności w trybie sekwencyjnym.

Ustaw kolor tła albo własny obraz, także GIF, i przyciemnienie **0–80%**. Siła odbicia **0–10** określa, jak mocno obraz reaguje na uderzenia. Systemowe ustawienie ograniczenia ruchu wyłącza odbicie.

### Kolory zmieniane na żywo

Panel kolorów pozostaje dostępny podczas pokazu: gotowe kolory, odcień, nasycenie, siła, jasność, kontrast i opcjonalne kolorowanie tła. Ukrycie panelu nie wyłącza ustawionego efektu.

Automatycznie przechodź przez wybraną paletę co **0,5–30 sekund** lub co **1, 2, 4, 8 albo 16 uderzeń**. Płynność **0%** oznacza cięcie, **100%** — ciągłe przejście. Przy ustawionym BPM kolory korzystają z tempa i siatki rytmu.

</td>
</tr>
</table>

<table>
<tr>
<td width="62%" align="center" valign="top">
<img src="https://i.imgur.com/xfoCQh5.png" alt="Przegląd animacji z filtrami fraz oraz kolumnami On screen i Put aside.">
<br><sub><b>Przegląd animacji</b> — wybierz, co trafi na ekran, i zapisz własny zestaw.</sub>
</td>
<td width="38%" align="center" valign="top">
<img src="https://i.imgur.com/i9wk701.png" alt="Ustawienia GIFbit z wczytanym przykładowym zestawem 255 animacji.">
<br><sub><b>Ustawienia pokazu</b> — źródło animacji, reakcja na rytm i wygląd sceny.</sub>
</td>
</tr>
</table>

## Szybki start

Wymagany jest Node.js 20 lub nowszy. W katalogu projektu uruchom:

```sh
npm ci
npm start
```

Otwórz [localhost:4173/gifbit/](http://127.0.0.1:4173/gifbit/). `npm start` buduje aplikację do `dist/` i uruchamia jej podgląd. Po pierwszej instalacji zależności wystarczy samo `npm start`.

Do pracy nad kodem użyj podglądu źródeł, bez builda i bez instalacji zależności:

```sh
npm run dev
```

Adres pozostaje ten sam. Po zmianie plików odśwież stronę. Źródła używają natywnych modułów JavaScript i wymagają HTTP lub HTTPS.

Sam katalog do publikacji przygotujesz poleceniem `npm run build`, a istniejący build obejrzysz przez `npm run preview`. `dist/` zawiera wyłącznie HTML, CSS, ikonę i dwa pliki JavaScript. Style i ikona trafiają do `dist/assets/`, a procesor audio do `dist/audio/`. Cały `dist/` można udostępnić na dowolnym hostingu statycznym.

## Banki GIF-ów

Źródłem panelu jest katalog **`gif-banks/` na gałęzi `main` w `PeterPorzuczek/gifbit`**. Aplikacja pobiera listę plików przez GitHub Trees API, a zawartość wybranego banku przez GitHub Blobs API, według jego SHA. Pliki JSON są pobierane dopiero po kliknięciu banku. Działa to tak samo w podglądzie źródeł, buildzie i pojedynczym HTML. Nie ma lokalnej listy banków ani kopii JSON w `dist/`. Dokumentacja API: [drzewa repozytorium](https://docs.github.com/en/rest/git/trees#get-a-tree), [zawartość plików](https://docs.github.com/en/rest/git/blobs#get-a-blob).

Lista plików z API nie zawiera ich wewnętrznych metadanych. Dlatego nieotwarty bank początkowo ma nazwę pliku bez `.json` i pusty opis. Po otwarciu aplikacja używa pól `name` i `description`, jeśli występują, oraz zapamiętuje je dla następnej wizyty. Zmiana SHA pliku unieważnia zapisane metadane. Jeśli pól nie ma lub są puste, pozostaje nazwa pliku i pusty opis.

Gwiazdką oznaczasz cały bank, a **Favorites only** ogranicza listę do ulubionych. Pole wyszukiwania uwzględnia nazwę pliku oraz poznaną nazwę i opis. **Refresh** pobiera aktualną listę. Po otwarciu banku **Select all** i **Clear selection** pomagają wybrać animacje do importu. Import tworzy własny zapisany zestaw, który można następnie edytować w **Review animations**.

Panel korzysta z publicznego API bez tokena. Przy braku sieci, limicie GitHuba, niepoprawnym JSON lub pustym repozytorium pokazuje komunikat i pozwala ponowić próbę. Nowe lokalne pliki staną się widoczne w panelu dopiero po ich opublikowaniu na `main`. Przed publikacją można je sprawdzić przez **Import from file**.

### Dodawanie banku przez PR

1. Przygotuj zestaw w aplikacji i wybierz **Export**. Wpisz nazwę (do 60 znaków) i opcjonalny opis (do 1000 znaków).
2. Zachowaj wygenerowaną nazwę **`YYYY-MM-DD-nazwa-banku.json`**. Data jest datą eksportu w UTC; część opisowa zawiera małe litery ASCII, cyfry i myślniki.
3. Dodaj plik do **`gif-banks/`**. Użyj innej nazwy, jeśli plik z tą datą i nazwą już istnieje.
4. Uruchom `npm run check:banks` i utwórz PR. Workflow **Validate GIF banks** sprawdza format, datę i nazwę pliku oraz poprawność danych animacji. Walidator wymaga tylko Node.js, bez instalacji pakietów.
5. Po połączeniu PR-a do `main` bank pojawi się po odświeżeniu listy. Nie trzeba zmieniać kodu ani ręcznie utrzymywać indeksu.

Bank używa formatu eksportu aplikacji: `gifbit: 1`, `name`, `description`, `created`, `updated`, `words` i `items`. Stare pliki bez `description` nadal działają. Eksport wszystkich zestawów zawiera `sets`; panel pokazuje taki plik jako jeden bank, łącząc animacje bez powtórzeń. Ręczny import tego pliku zachowuje osobne zestawy.

## Jeden plik HTML

Opcjonalny eksport pakuje aplikację do jednego pliku. Zainstaluj narzędzia deweloperskie raz, a następnie uruchom:

```sh
npm ci
npm run build:single
```

Obok zwykłego builda powstanie **`dist/gifbit.html`**. Możesz skopiować tylko ten plik na inny komputer i otworzyć go w przeglądarce. Zawiera interfejs, style, ikonę, kod aplikacji i procesor audio. Nie potrzebuje sąsiednich plików ani lokalnego serwera do ręcznego odtwarzania i obsługi zestawów.

Przeglądanie banków przez GitHub API oraz pobieranie i wyszukiwanie animacji wymagają internetu. Własne zestawy nadal można importować z plików JSON. Mikrofon zależy od uprawnień i obsługi lokalnych plików przez przeglądarkę; jeśli odmawia dostępu, udostępnij ten sam HTML przez HTTPS lub localhost.

Build korzysta z esbuild i po instalacji zależności nie wymaga dostępu do sieci. Każde budowanie odtwarza `dist/` od zera; cały katalog jest ignorowany przez Git. Po zmianie źródeł ponownie wykonaj `npm run build:single`, aby odświeżyć eksport.

## Skróty klawiaturowe

| Klawisz | Działanie podczas pokazu |
| --- | --- |
| Spacja / kliknięcie sceny | Ręczne uderzenie |
| T | Wystukiwanie tempa |
| K | Pokazanie lub ukrycie panelu kolorów |
| C | Wyczyszczenie sceny |
| H | Pokazanie lub ukrycie miernika |
| F | Przełączenie pełnego ekranu |
| S | Otwarcie ustawień |
| Esc | Ustawienia / powrót do pokazu; zamknięcie przeglądu, banków, eksportu lub kalibracji |
| ← / → w kalibracji | Zmiana wyprzedzenia o 5 ms |

## GitHub Pages

Workflow [pages.yml](.github/workflows/pages.yml) instaluje zależności, uruchamia testy jednostkowe, buduje aplikację i publikuje wyłącznie `dist/`. Wszystkie ścieżki są względne i działają pod `/gifbit/`.

Po wypchnięciu kodu, gdy zdecydujesz się go opublikować:

1. Otwórz repozytorium **PeterPorzuczek/gifbit** → **Settings** → **Pages**.
2. W **Build and deployment** → **Source** wybierz **GitHub Actions**.
3. Otwórz **Actions** → **Deploy to GitHub Pages** → **Run workflow**, wybierz **main** i uruchom workflow.
4. Po zakończeniu wdrożenia aplikacja będzie dostępna pod [peterporzuczek.github.io/gifbit/](https://peterporzuczek.github.io/gifbit/).

Kolejne aktualizacje `main` publikują zmiany automatycznie. Nie trzeba commitować wygenerowanych plików. Szczegóły: [oficjalna instrukcja GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Organizacja kodu

Kod aplikacji w **`src/`** jest podzielony według funkcji. W jego katalogu głównym pozostają tylko `index.html` i `app.js`. Banki są osobno w **`gif-banks/`**, narzędzia w **`scripts/`**, a testy w **`tests/`**. **`dist/`** powstaje automatycznie.

| Ścieżka | Odpowiedzialność |
| --- | --- |
| `src/index.html` | Interfejs i punkt wejścia aplikacji |
| `src/app.js` | Utworzenie modułów i kolejność ich inicjalizacji |
| `src/audio/` | Mikrofon (`microphone.js`), wykrywanie uderzeń (`detector.js`, `worklet.js`), przewidywanie rytmu (`groove.js`), tempo i zdarzenia uderzeń (`rhythm.js`), kalibracja (`calibration.js`) |
| `src/library/` | Wczytywanie animacji z GIPHY lub zestawu (`catalog.js`), przegląd i selekcja (`curator.js`), zarządzanie zestawami (`sets.js`), walidacja i format importu/eksportu (`format.js`) |
| `src/banks/` | GitHub API (`api.js`), odczyt banków (`format.js`), panel przeglądania, ulubione i import (`panel.js`) |
| `src/stage/` | Odtwarzanie i układ animacji (`playback.js`), kolory (`colors.js`), skróty i przyciski (`controls.js`), pełny ekran i blokada wygaszania (`browser.js`), uruchamianie pokazu i powrót do ustawień (`session.js`) |
| `src/settings/` | Formularz ustawień (`form.js`) oraz wartości domyślne i walidacja (`schema.js`) |
| `src/core/` | Wspólny stan i zapis ustawień (`state.js`), dostęp do elementów interfejsu (`dom.js`), ładowanie zewnętrznych zasobów (`resources.js`) |
| `src/assets/` | Arkusz `style.css` i ikona `favicon.svg`; fonty systemowe |
| `gif-banks/` | Banki JSON dodawane przez PR-y; początkowy `2026-11-05-hh3.json` zawiera 255 animacji |
| `scripts/serve.mjs` | Podgląd `dist/` lub źródeł, bez zależności |
| `scripts/build.mjs` | Build do `dist/` i opcjonalny eksport do jednego HTML |
| `scripts/check-banks.mjs` | Walidacja nazw i formatu banków |
| `tests/` | Testy silnika audio, danych, eksportu i zachowania aplikacji w przeglądarce |
| `.github/workflows/pages.yml` | Automatyczne budowanie i publikacja na GitHub Pages |
| `.github/workflows/banks.yml` | Sprawdzanie banków w PR-ach |
| `dist/` | Gotowa aplikacja; pliki generowane, pomijane przez Git |

Moduły korzystają z natywnych importów ES. Nowe funkcje trafiają do odpowiedniego katalogu, a ich inicjalizacja do `src/app.js`. Kod współdzielony przez funkcje jest w `core/`.

Banki są pobierane wyłącznie przez GitHub API; lokalny serwer nie udostępnia katalogu `gif-banks/`, a build go nie kopiuje. Screenshoty README są hostowane na Imgur; projekt nie przechowuje ich lokalnych kopii ani plików fontów.

## Testowanie

Zainstaluj zależności deweloperskie, uruchom testy danych, audio i eksportu, a następnie testy przeglądarkowe:

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Na Windows można użyć już zainstalowanego Edge, bez pobierania Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
```

Testy przeglądarkowe najpierw budują aplikację, następnie sprawdzają ją pod prefiksem `/gifbit/` w trzech wariantach: bezpośrednio ze źródeł, jako gotowy `dist/` oraz pojedynczy HTML. Osobny test kopiuje wyłącznie wygenerowany plik do pustego katalogu i sprawdza import banku, odtwarzanie oraz procesor audio po otwarciu przez `file://`. Testy banków zastępują odpowiedzi GitHub API kontrolowanymi danymi: sprawdzają pobieranie dopiero po kliknięciu, metadane, ulubione, import wybranych GIF-ów, datowane eksporty, zmienione pliki, opóźnione odpowiedzi i błędy API. Pozostałe obejmują selekcję i przeciąganie, zapis i usuwanie zestawów, kolejność obrazów, wyświetlanie, kolory, skróty, widok mobilny, błędne dane, żądania GIPHY, odmowę mikrofonu, `AudioWorklet`, zapasowy detektor i zwalnianie strumienia. Audio w testach pochodzi z urządzenia syntetycznego; kalibrację rzeczywistego mikrofonu i ekranu wykonuje się na docelowym sprzęcie.

## Dane i zasoby

Ustawienia, klucz API, zestawy i wykluczone animacje są przechowywane w `localStorage` tej przeglądarki (`gifbit.v1`, `gifbit.sets`, `gifbit.excluded`). Ulubione banki zapisuje `gifbit.banks.favorites`, a poznane nazwy i opisy `gifbit.banks.metadata`. Zachowano zgodność z wcześniejszym formatem zestawów. Klucz GIPHY nie jest zaszyfrowany. Zmiana adresu aplikacji, przeglądarki lub wyczyszczenie danych witryny oznacza osobny magazyn; zestawy warto wcześniej wyeksportować do JSON.

Animacje są pobierane bezpośrednio z GIPHY i należą do ich twórców. Ich dostępność zależy od źródłowych linków. Interfejs korzysta z fontów systemowych i nie pobiera plików fontów. Screenshoty README są udostępniane przez Imgur.
