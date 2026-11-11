![GIFbit — scena z animacjami z sample.json i panelem kolorów](docs/images/stage.png)

# GIFbit

Prosta aplikacja do wizualizacji muzyki: mikrofon wykrywa uderzenia, a na ekranie pojawiają się animacje z GIPHY. Można też sterować pokazem ręcznie, bez mikrofonu. Aplikacja działa w przeglądarce, bez backendu, frameworka i procesu budowania.

## Szybki start

W katalogu projektu uruchom jeden z poniższych serwerów:

```sh
node scripts/serve.mjs
```

Otwórz [localhost:4173/gifbit/](http://127.0.0.1:4173/gifbit/). Wystarczy Node.js 20 lub nowszy. Nie trzeba wykonywać `npm install`. Skrót `npm start` uruchamia ten sam serwer.

Alternatywnie, z Pythonem:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Wtedy otwórz [localhost:4173](http://localhost:4173). Aplikację należy udostępniać przez HTTP lub HTTPS, ponieważ używa natywnych modułów JavaScript. Otwarcie `index.html` przez `file://` nie wystarczy.

1. Kliknij **Load sample animations**, aby wczytać 255 animacji z dołączonego `sample.json`. Nie potrzebujesz klucza API.
2. Wybierz **Review animations**, aby przejrzeć i ograniczyć zestaw, albo od razu **Start without microphone**.
3. Naciśnij **Spację** lub kliknij scenę, aby wywołać uderzenie i wyświetlić animację.
4. Wybierz **Start** i zezwól na mikrofon, aby pokaz reagował na muzykę z głośników. Dostęp do mikrofonu wymaga HTTPS lub localhost.

![Ustawienia GIFbit z wczytanym zestawem przykładowym](docs/images/settings.png)

## Źródła i zestawy animacji

- Wyszukiwanie GIPHY według maksymalnie 10 słów lub fraz. Separatory: przecinki, średniki i nowe linie. Powtórzone frazy są pomijane.
- GIF-y, naklejki z przezroczystym tłem albo oba typy jednocześnie. Filtr treści PG-13 można wyłączyć.
- Własny klucz GIPHY jest wpisywany w ustawieniach. Limity zapytań zależą od planu API; wyszukiwanie używa jednego zapytania na frazę i typ animacji. Wyświetlanie już wczytanych wyników nie wykonuje kolejnych zapytań wyszukiwania.
- **Review animations** pokazuje kolumny **On screen** i **Put aside**. Kliknięcie albo przeciągnięcie przenosi animację między kolumnami. Dostępne są filtry fraz, zmiana rozmiaru miniaturek i operacje na wszystkich widocznych elementach.
- **Shuffle** zmienia kolejność listy. **Add from set** dołącza animacje z innego zapisanego zestawu albo pliku JSON, bez duplikowania identyfikatorów.
- **Save as set** zapisuje aktywne animacje. Użycie istniejącej nazwy aktualizuje zestaw. Można importować wiele plików, eksportować pojedynczy zestaw lub wszystkie zestawy i usuwać zestawy po ponownym kliknięciu potwierdzenia.
- Zachowany format `gifbit: 1`: pojedynczy obiekt zestawu, tablica zestawów albo obiekt z tablicą `sets`. Pliki zawierają linki HTTPS do obrazów, więc ich odtwarzanie nadal wymaga internetu. `sample.json` zachowano bez zmian.

![Przegląd animacji i selekcja zestawu](docs/images/curator.png)

## Rytm i mikrofon

- Wybór pasma: **Kick** (30–150 Hz), **Snare** (200–6000 Hz) lub **Everything** (30–16000 Hz).
- Czułość detektora 1–10; zmiana animacji co 1, 2 lub 4 uderzenia.
- Opcjonalne tempo 50–220 BPM wpisywane ręcznie lub wystukiwane przyciskiem **Tap**. Po czterech stuknięciach aplikacja wylicza tempo; dłuższa przerwa rozpoczyna pomiar od nowa.
- Bez BPM aplikacja reaguje bezpośrednio na wykryte uderzenia. Z BPM dopasowuje siatkę rytmu i przewiduje powtarzający się wzór. Nowe uderzenia i przejścia nadal obsługuje na bieżąco.
- Ograniczenie szybkości zmiany GIF-ów do 1/32, 1/16, 1/8 lub 1/4 nuty. Szybsze uderzenia nadal wprawiają obraz w ruch.
- Wyprzedzenie obrazu 0–250 ms i osobny ekran **Calibrate** do dopasowania obrazu do dźwięku na docelowym ekranie.
- Miernik poziomu sygnału, próg detekcji oraz status synchronizacji i przewidywania.
- Detekcja w `AudioWorklet`; zachowana ścieżka zapasowa `ScriptProcessor`. Dźwięk jest analizowany lokalnie, bez nagrywania i wysyłania audio na serwer. Strumień mikrofonu jest zwalniany przy opuszczeniu strony.

## Scena i kolory

- Kolaż od 1 do 12 animacji albo pojedyncza animacja na całym ekranie.
- Losowa kolejność lub odtwarzanie zgodnie z kolejnością listy. Obrazy są wstępnie ładowane i dekodowane; wolniejsze pobieranie nie zmienia kolejności w trybie **In order**.
- Kolor tła lub własny obraz, także GIF, z przyciemnieniem 0–80%.
- Siła odbicia 0–10. Systemowe ustawienie ograniczenia ruchu wyłącza odbicie.
- Panel kolorów dostępny podczas pokazu: gotowe kolory, odcień, nasycenie, siła, jasność, kontrast i opcjonalne kolorowanie tła.
- Automatyczne przechodzenie przez wybraną paletę: co 0,5–30 sekund albo co 1, 2, 4, 8 lub 16 uderzeń. Płynność 0% oznacza cięcie, 100% — ciągłe przejście. Przy ustawionym BPM kolory korzystają z tempa i siatki rytmu.
- Pełny ekran, automatycznie chowające się przyciski oraz blokada wygaszania ekranu, jeśli przeglądarka ją obsługuje.

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

## GitHub Pages — bez builda

Repozytorium jest gotowe do publikacji bezpośrednio z gałęzi `main`. Wszystkie ścieżki są względne i działają pod `/gifbit/`. Plik `.nojekyll` wyłącza przetwarzanie Jekyll.

Po wypchnięciu kodu, gdy zdecydujesz się go opublikować:

1. Otwórz repozytorium **PeterPorzuczek/gifbit** → **Settings** → **Pages**.
2. W **Build and deployment** wybierz **Deploy from a branch**.
3. Wskaż **main** i **/(root)**, a następnie **Save**.
4. Po zakończeniu wdrożenia aplikacja będzie dostępna pod [peterporzuczek.github.io/gifbit/](https://peterporzuczek.github.io/gifbit/).

Nie są potrzebne własny workflow, katalog `dist`, instalacja zależności ani kompilacja. Kolejne aktualizacje gałęzi publikują zmiany automatycznie. Szczegóły: [oficjalna instrukcja GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Organizacja kodu

| Ścieżka | Odpowiedzialność |
| --- | --- |
| `index.html` | Interfejs aplikacji |
| `gifbit.html` | Przekierowanie ze starej nazwy pliku |
| `styles/` | Style podzielone na scenę, ustawienia, kolory, zestawy i pozostałe widoki |
| `src/app.js` | Utworzenie modułów i kolejność ich inicjalizacji |
| `src/state.js`, `src/data/settings.js` | Wspólne ustawienia, walidacja i zapis |
| `src/audio/` | Detektor uderzeń, silnik rytmu i procesor audio |
| `src/library.js`, `src/sets.js`, `src/data/sets.js` | GIPHY, aktywne animacje, przechowywanie i format zestawów |
| `src/playback.js`, `src/rhythm.js`, `src/microphone.js` | Ładowanie obrazów, scena, pętla animacji i mikrofon |
| `src/settings.js`, `src/curator.js`, `src/colors.js`, `src/calibration.js` | Poszczególne panele interfejsu |
| `src/session.js`, `src/controls.js`, `src/browser.js` | Uruchomienie pokazu, skróty, pełny ekran i blokada wygaszania |
| `assets/` | Ikona oraz lokalne fonty wraz z licencjami |
| `sample.json` | Przykładowy zestaw 255 animacji |
| `scripts/serve.mjs` | Opcjonalny serwer lokalny, bez zależności |
| `tests/` | Testy silnika audio, danych i zachowania aplikacji w przeglądarce |

Moduły korzystają z natywnych importów ES. Nowe funkcje można dodać do właściwego modułu albo podłączyć jako kolejny moduł w `src/app.js`. Kod aplikacji nie wymaga generowania plików wynikowych.

## Testowanie

Testy silnika audio, ustawień i formatu JSON nie wymagają instalacji pakietów:

```sh
npm test
```

Do testów przeglądarkowych potrzebny jest wyłącznie deweloperski Playwright:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Na Windows można użyć już zainstalowanego Edge, bez pobierania Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:browser
```

Testy uruchamiają aplikację również pod prefiksem `/gifbit/`. Obejmują import i eksport, selekcję i przeciąganie, zapis i usuwanie zestawów, kolejność obrazów przy różnym czasie ładowania, wyświetlanie, kolory, skróty, widok mobilny, błędne dane, żądania GIPHY, odmowę mikrofonu, `AudioWorklet`, zapasowy detektor i zwalnianie strumienia. Audio w testach pochodzi z urządzenia syntetycznego; kalibrację rzeczywistego mikrofonu i ekranu wykonuje się na docelowym sprzęcie.

## Dane i zasoby

Ustawienia, klucz API, zestawy i wykluczone animacje są przechowywane w `localStorage` tej przeglądarki (`gifbit.v1`, `gifbit.sets`, `gifbit.excluded`). Zachowano zgodność z wcześniejszym formatem. Klucz nie jest zaszyfrowany. Zmiana adresu aplikacji, przeglądarki lub wyczyszczenie danych witryny oznacza osobny magazyn; zestawy warto wcześniej wyeksportować do JSON.

Animacje są pobierane bezpośrednio z GIPHY i należą do ich twórców. Ich dostępność zależy od źródłowych linków. Fonty Bricolage Grotesque, Figtree i JetBrains Mono są dostarczane lokalnie na licencjach SIL Open Font License; treści licencji znajdują się w `assets/fonts/`.
