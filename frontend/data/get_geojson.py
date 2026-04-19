"""
=================================================================
Скрипт : get_geojson.py
Версия : 4.0
Дата   : 2026-04-18
Автор  : Claude Sonnet 4.6

Скачивает два файла в frontend/data/:
  land.geojson    — суша с Антарктидой до -90° (для заливки)
  borders.geojson — границы стран (линии поверх заливки)

Проверяет каждый файл на наличие координат широтой ≤ -85°.
Если все источники провалились — выводит инструкцию mapshaper.

Запуск из корня проекта: python get_geojson.py
=================================================================
"""
import urllib.request, os, json, sys

os.makedirs("frontend/data", exist_ok=True)

# ── Источники land.geojson ────────────────────────────────────
# Ищем ne_110m_land или аналог С Антарктидой до -90°
LAND_SOURCES = [
    # geojson.xyz — Natural Earth 3.3.0, конвертированный без обрезки
    "https://geojson.xyz/naturalearth-3.3.0/ne_110m_land.geojson",
    # nvkelso CDN (может быть trimmed — проверяем)
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_land.geojson",
    # raw GitHub
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson",
]

# ── Источники borders.geojson ─────────────────────────────────
BORDER_SOURCES = [
    "https://geojson.xyz/naturalearth-3.3.0/ne_110m_admin_0_boundary_lines_land.geojson",
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_boundary_lines_land.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_boundary_lines_land.geojson",
]

def download(url, path):
    """Скачивает файл. Возвращает True при успехе."""
    try:
        print(f"  GET {url[:72]}...")
        urllib.request.urlretrieve(url, path)
        return True
    except Exception as e:
        print(f"  ERR {e}")
        return False

def min_lat_in_geojson(path):
    """
    Находит минимальную широту в GeoJSON.
    Рекурсивно обходит все координаты.
    Возвращает float (минимальная широта) или None при ошибке.
    """
    def walk(coords):
        if not coords:
            return
        if isinstance(coords[0], (int, float)):
            # Это точка [lon, lat] или [lon, lat, alt]
            yield coords[1]
        else:
            for item in coords:
                yield from walk(item)

    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        min_lat = 90.0
        for feat in data.get("features", []):
            geom = feat.get("geometry") or {}
            for lat in walk(geom.get("coordinates", [])):
                if lat < min_lat:
                    min_lat = lat
        return min_lat
    except Exception as e:
        print(f"  [validate error] {e}")
        return None

def try_sources(sources, out_path, label):
    """
    Пробует источники по порядку.
    Выбирает первый у которого min_lat ≤ -85°.
    Возвращает True при успехе.
    """
    print(f"\n── {label}  →  {out_path}")
    best_path = out_path + ".best"
    best_lat  = 90.0

    for url in sources:
        tmp = out_path + ".tmp"
        if not download(url, tmp):
            continue

        min_lat = min_lat_in_geojson(tmp)
        if min_lat is None:
            os.remove(tmp)
            continue

        n = len(json.load(open(tmp, encoding="utf-8")).get("features", []))
        print(f"  → объектов: {n}, мин. широта: {min_lat:.2f}°", end="")

        if min_lat <= -85.0:
            print("  ✓ Антарктида есть!")
            if os.path.exists(best_path): os.remove(best_path)
            os.rename(tmp, best_path)
            if os.path.exists(out_path): os.remove(out_path)
            os.rename(best_path, out_path)
            return True
        else:
            print(f"  ✗ Антарктида обрезана (нужно ≤ -85°)")
            # Сохраняем как запасной вариант
            if min_lat < best_lat:
                best_lat = min_lat
                if os.path.exists(best_path): os.remove(best_path)
                os.rename(tmp, best_path)
            else:
                os.remove(tmp)

    # Ни один источник не прошёл — используем лучший из доступных
    if os.path.exists(best_path):
        if os.path.exists(out_path): os.remove(out_path)
        os.rename(best_path, out_path)
        print(f"  ⚠ Лучшее что нашлось: мин. широта {best_lat:.2f}° (Антарктида неполная)")
        return False

    print(f"  ✗ Все источники недоступны")
    return False


# ── Запуск ────────────────────────────────────────────────────
print("=" * 60)
print("FlatEarthMap — загрузка GeoJSON  (v4.0)")
print("=" * 60)

land_ok    = try_sources(LAND_SOURCES,   "frontend/data/land.geojson",    "land.geojson")
borders_ok = try_sources(BORDER_SOURCES, "frontend/data/borders.geojson", "borders.geojson")

print("\n" + "=" * 60)
if land_ok:
    print("✓ land.geojson    — Антарктида до -90° присутствует")
else:
    print("✗ land.geojson    — Антарктида обрезана или файл не скачан")

if borders_ok:
    print("✓ borders.geojson — OK")
else:
    print("⚠ borders.geojson — обрезан или не скачан")

if not land_ok:
    print("""
─────────────────────────────────────────────────────────
Как получить полный файл вручную (5 минут):

1. Скачай SHP с официального сайта Natural Earth:
   https://www.naturalearthdata.com/downloads/110m-physical-vectors/
   → кнопка "Download land" (ne_110m_land.zip)

2. Открой https://mapshaper.org

3. Перетащи ne_110m_land.zip прямо на страницу

4. Нажми Export → выбери GeoJSON → сними галочку Simplify
   (или поставь 0%) → кнопка Export

5. Сохрани файл как:
   frontend/data/land.geojson

Проверка — открой файл и найди строку "-90":
   grep -c '\\-90' frontend/data/land.geojson
Если ответ > 0 — файл полный.
─────────────────────────────────────────────────────────""")

print("\nПерезапусти сервер: python -m http.server 8080")
