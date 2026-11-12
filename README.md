<div align="center">

<img src="src/favicon.svg" width="104" alt="">

# GIFbit

**Animacje, które trafiają w rytm.**<br>
Wybierz GIF-y, włącz muzykę i zamień ekran w pokaz sterowany uderzeniami.

![HTML · CSS · JavaScript](https://img.shields.io/badge/HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-342c41)
![Statyczna aplikacja](https://img.shields.io/badge/deploy-statyczny-ff6b3d)
![W przeglądarce](https://img.shields.io/badge/dzia%C5%82a-w%20przegl%C4%85darce-342c41)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-342c41)](#github-pages)

**[Szybki start](#szybki-start)** ·
**[Funkcje](#funkcje)** ·
**[Jeden HTML](#jeden-plik-html)** ·
**[GitHub Pages](#github-pages)** ·
**[Dokumentacja](#organizacja-kodu)**

<br>

<img src="https://i.imgur.com/OJO2YLg.png" width="900" alt="GIFbit: kolaż animacji z sample.json, panel kolorów po prawej i miernik uderzeń w lewym dolnym rogu.">

</div>

## Po co GIFbit

Prosta aplikacja do wizualizacji muzyki: mikrofon wykrywa uderzenia, a na ekranie pojawiają się animacje z GIPHY. Można też sterować pokazem ręcznie, bez mikrofonu. Aplikacja działa w przeglądarce, bez backendu i frameworka. Krótki build przygotowuje statyczny katalog `dist/` do publikacji; źródła można uruchamiać bez budowania.

## Od muzyki do pokazu

Po [uruchomieniu aplikacji](#szybki-start) wystarczą cztery kroki:

1. Kliknij **Load sample animations**, aby wczytać 255 animacji z dołączonego `sample.json`. Nie potrzebujesz klucza API.
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

Dołączony **sample.json** zachowano bez zmian — to 255 animacji do wypróbowania bez klucza API. Zestawy zawierają linki HTTPS do obrazów, więc odtwarzanie wymaga internetu.

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

Sam katalog do publikacji przygotujesz poleceniem `npm run build`, a istniejący build obejrzysz przez `npm run preview`. `dist/` zawiera wyłącznie HTML, CSS, ikonę, dane przykładowe i dwa pliki JavaScript. Można go udostępnić na dowolnym hostingu statycznym.

## Jeden plik HTML

Opcjonalny eksport pakuje aplikację do jednego pliku. Zainstaluj narzędzia deweloperskie raz, a następnie uruchom:

```sh
npm ci
npm run build:single
```

Obok zwykłego builda powstanie **`dist/gifbit.html`**. Możesz skopiować tylko ten plik na inny komputer i otworzyć go w przeglądarce. Zawiera interfejs, style, ikonę, kod aplikacji, procesor audio i przykładowy zestaw 255 animacji. Nie potrzebuje sąsiednich plików ani lokalnego serwera do ręcznego odtwarzania i obsługi zestawów.

Animacje pozostają linkami do GIPHY, więc ich pobieranie oraz wyszukiwanie wymagają internetu. Mikrofon zależy od uprawnień i obsługi lokalnych plików przez przeglądarkę; jeśli odmawia dostępu, udostępnij ten sam HTML przez HTTPS lub localhost.

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
| Esc | Ustawienia / powrót do pokazu; zamknięcie przeglądu lub kalibracji |
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

Pliki aplikacji są w **`src/`**, narzędzia w **`scripts/`**, a testy w **`tests/`**. Katalog główny zawiera README i konfigurację projektu. **`dist/`** powstaje automatycznie.

| Ścieżka | Odpowiedzialność |
| --- | --- |
| `src/index.html` | Interfejs i punkt wejścia aplikacji |
| `src/style.css`, `src/favicon.svg` | Wszystkie style oraz ikona; fonty systemowe |
| `src/app.js` | Utworzenie modułów i kolejność ich inicjalizacji |
| `src/` | Płaska struktura modułów: audio, rytm, odtwarzanie, ustawienia, zestawy, kolory i pozostałe panele |
| `src/settings-data.js`, `src/sets-data.js` | Walidacja ustawień i format zestawów JSON |
| `src/resources.js` | Ładowanie próbki i procesora audio; przy eksporcie zastępowane zasobami osadzonymi w HTML |
| `src/sample.json` | Niezmieniony zestaw 255 przykładowych animacji |
| `scripts/serve.mjs` | Podgląd `dist/` lub `src/`, bez zależności |
| `scripts/build.mjs` | Build do `dist/` i opcjonalny eksport do jednego HTML |
| `tests/` | Testy silnika audio, danych, eksportu i zachowania aplikacji w przeglądarce |
| `.github/workflows/pages.yml` | Automatyczne budowanie i publikacja na GitHub Pages |
| `dist/` | Gotowa aplikacja; pliki generowane, pomijane przez Git |

Moduły korzystają z natywnych importów ES. Nowe funkcje można dodać do właściwego modułu albo podłączyć w `src/app.js`. Screenshoty README są hostowane na Imgur; projekt nie przechowuje ich lokalnych kopii ani plików fontów.

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

Testy przeglądarkowe najpierw budują aplikację, następnie sprawdzają ją pod prefiksem `/gifbit/` w dwóch wariantach: jako gotowy `dist/` oraz pojedynczy HTML. Osobny test kopiuje wyłącznie wygenerowany plik do pustego katalogu i sprawdza próbkę, odtwarzanie oraz procesor audio po otwarciu przez `file://`. Obejmują import i eksport, selekcję i przeciąganie, zapis i usuwanie zestawów, kolejność obrazów przy różnym czasie ładowania, wyświetlanie, kolory, skróty, widok mobilny, błędne dane, żądania GIPHY, odmowę mikrofonu, `AudioWorklet`, zapasowy detektor i zwalnianie strumienia. Audio w testach pochodzi z urządzenia syntetycznego; kalibrację rzeczywistego mikrofonu i ekranu wykonuje się na docelowym sprzęcie.

## Dane i zasoby

Ustawienia, klucz API, zestawy i wykluczone animacje są przechowywane w `localStorage` tej przeglądarki (`gifbit.v1`, `gifbit.sets`, `gifbit.excluded`). Zachowano zgodność z wcześniejszym formatem. Klucz nie jest zaszyfrowany. Zmiana adresu aplikacji, przeglądarki lub wyczyszczenie danych witryny oznacza osobny magazyn; zestawy warto wcześniej wyeksportować do JSON.

Animacje są pobierane bezpośrednio z GIPHY i należą do ich twórców. Ich dostępność zależy od źródłowych linków. Interfejs korzysta z fontów systemowych i nie pobiera plików fontów. Screenshoty README są udostępniane przez Imgur.
