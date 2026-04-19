# FeMap v3.0

Интерактивная карта в азимутальной равноудалённой проекции.
Сайт: https://femap.onrender.com

## Запуск локально

Открыть `frontend/index.html` через локальный сервер:
```bash
cd frontend
python -m http.server 8080
```
Затем открыть http://localhost:8080

## Структура

```
FeMap/
├── frontend/
│   ├── index.html       ← главная страница
│   ├── static/
│   │   ├── style.css    ← стили
│   │   └── map.js       ← логика карты
│   └── data/
│       └── countries.geojson  ← контуры стран
├── render.yaml          ← деплой на Render
└── README.md
```

## Деплой

Push в ветку main → автодеплой на Render.
