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

