"""
graphics.py
Функции для рисования карты и объектов:
- сетка
- материки
- города
- Солнце
- Луна
- дневная зона
"""

import matplotlib.pyplot as plt
import numpy as np
from utils import transform_coordinates


def draw_grid(ax, center_lat=90, center_lon=0):
    """
    Рисует специальные параллели и меридианы на полярной карте
    как отдельные точки, чтобы линии не соединялись.

    Параллели:
        - Экватор: зеленый
        - Северный тропик: синий
        - Южный тропик: красный

    Меридианы:
        - 0° (Гринвич), 90° восточной долготы, 180°, -90° западной долготы
        рисуются отдельными точками.

    :param ax: объект matplotlib.axes (с полярной проекцией)
    :param center_lat: центр карты (широта)
    :param center_lon: центр карты (долгота)
    """
    import numpy as np
    from utils import transform_coordinates

    # --- Параллели ---
    special_lats = {0: 'green', 23.5: 'blue', -23.5: 'red'}
    for lat, color in special_lats.items():
        theta_vals = []
        r_vals = []
        for lon in np.linspace(-180, 180, 181):
            r, theta = transform_coordinates(lat, lon, center_lat, center_lon)
            theta_vals.append(theta)
            r_vals.append(r)
        ax.scatter(theta_vals, r_vals, color=color, s=5, zorder=2)  # s=размер точек

    # --- Меридианы ---
    meridians = [0, 90, 180, -90]
    for lon in meridians:
        theta_vals = []
        r_vals = []
        for lat in np.linspace(-90, 90, 91):
            r, theta = transform_coordinates(lat, lon, center_lat, center_lon)
            theta_vals.append(theta)
            r_vals.append(r)
        ax.scatter(theta_vals, r_vals, color='yellow', s=5, zorder=3)


def draw_continents(ax, filename="data/coastline.txt",
                    center_lat=90, center_lon=0, color='red', lw=0.5):
    """
    Рисует материки из файла coastline.txt.
    Поддерживает разделение материков по пустым строкам.

    :param ax: объект matplotlib.axes
    :param filename: путь к файлу с координатами
    :param center_lat: центр карты (широта)
    :param center_lon: центр карты (долгота)
    :param color: цвет линий
    :param lw: толщина линий
    """
    try:
        with open(filename, encoding='utf-8') as f:
            lines = f.readlines()

        segments = []
        current_segment = []

        for line in lines:
            if line.strip() == "":
                if current_segment:
                    segments.append(current_segment)
                    current_segment = []
                continue

            parts = line.strip().split(',')
            if len(parts) != 2:
                continue
            lon, lat = map(float, parts)
            if center_lat == 90:
                # фиксированный северный полюс — простое преобразование
                theta = np.radians(lon)
                r = 90 - lat
            else:
                # используем transform_coordinates для произвольного центра
                r, theta = transform_coordinates(lat, lon, center_lat, center_lon)
            current_segment.append((theta, r))

        if current_segment:
            segments.append(current_segment)

        for segment in segments:
            thetas, rs = zip(*segment)
            ax.plot(thetas, rs, color=color, linewidth=lw, zorder=5)

    except FileNotFoundError:
        print(f"Файл {filename} не найден. Контуры материков не будут отображены.")


def draw_cities(ax, cities, center_lat, center_lon):
    """Рисует города"""
    for city in cities:
        r, theta = transform_coordinates(city["lat"], city["lon"],
                                         center_lat, center_lon)
        ax.scatter(theta, r, marker='o', color='blue', s=10)
        ax.text(theta, r, city["name"], fontsize=6, color='yellow')


def draw_sun(ax, sun_lat, sun_lon, center_lat, center_lon):
    """Рисует Солнце"""
    r, theta = transform_coordinates(sun_lat, sun_lon, center_lat, center_lon)
    ax.scatter(theta, r, marker='*', color='orange', s=80, label='Солнце', zorder=10)
    ax.text(theta-0.2, r+0.3, "Sun", color='orange', fontsize=16)

def draw_moon(ax, moon_lat, moon_lon, center_lat, center_lon):
    """Рисует Луну"""
    r, theta = transform_coordinates(moon_lat, moon_lon, center_lat, center_lon)
    ax.scatter(theta, r, marker='o', color='white', s=40, label='Луна', zorder=10)


def draw_daylight(ax, sun_lat, sun_lon, center_lat=90, center_lon=0):
    """
    Закрашивает дневную зону вокруг Солнца.

    Логика:
        1. Строим сетку координат Земли (широта/долгота).
        2. Для каждой точки вычисляем угловое расстояние до Солнца.
        3. Считаем точку "дневной", если угол < 90° (π/2).
        4. Переводим координаты в проекцию (через transform_coordinates).
        5. Рисуем закрашенную область pcolormesh.

    :param ax: объект matplotlib.axes (с полярной проекцией)
    :param sun_lat: широта Солнца (в градусах)
    :param sun_lon: долгота Солнца (в градусах)
    :param center_lat: широта центра карты
    :param center_lon: долгота центра карты
    """
    import numpy as np
    from utils import transform_coordinates

    # --- 1. Сетка координат (каждые 2° для скорости)
    lats = np.linspace(-90, 90, 181)
    lons = np.linspace(-180, 180, 361)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    # --- 2. Угловое расстояние от точки к Солнцу (сферическая тригонометрия)
    angle = np.arccos(
        np.sin(np.radians(sun_lat)) * np.sin(np.radians(lat_grid)) +
        np.cos(np.radians(sun_lat)) * np.cos(np.radians(lat_grid)) *
        np.cos(np.radians(lon_grid - sun_lon))
    )

    # --- 3. Дневная зона (угол меньше 90°)
    daylight_mask = angle < np.pi / 2

    # --- 4. Переводим в проекцию
    r_vals = np.zeros_like(lat_grid, dtype=float)
    theta_vals = np.zeros_like(lon_grid, dtype=float)

    for i in range(lat_grid.shape[0]):
        for j in range(lat_grid.shape[1]):
            r, theta = transform_coordinates(
                lat_grid[i, j], lon_grid[i, j],
                center_lat, center_lon
            )
            r_vals[i, j] = r
            theta_vals[i, j] = theta

    # --- 5. Рисуем закраску
    ax.pcolormesh(
        theta_vals, r_vals, daylight_mask,
        shading='auto', cmap='YlOrBr',
        alpha=0.3, zorder=0
    )


# import matplotlib.patches as patches
#

def draw_daylight_polygon(ax, sun_lat, sun_lon, center_lat=90, center_lon=0, n_points=360):
#     """
#     Закрашивает дневную зону как многоугольник вокруг Солнца.
#
#     :param ax: полярная ось
#     :param sun_lat: широта Солнца
#     :param sun_lon: долгота Солнца
#     :param center_lat: центр карты
#     :param center_lon: центр карты
#     :param n_points: число точек по окружности (чем больше — тем плавнее)
#     """
#     import numpy as np
#     from utils import transform_coordinates
    pass
#     # --- углы вокруг Солнца для «круга дня»
#     angles = np.linspace(0, 2 * np.pi, n_points)
#
#     # радиус ~ 90° на сферической Земле (дневная зона ~ полусфера)
#     radius = 90  # можно подкорректировать по нужной ширине
#
#     # формируем точки по краю дневной зоны
#     lats = sun_lat + radius * np.sin(angles)
#     lons = sun_lon + radius * np.cos(angles)
#
#     # ограничиваем диапазон широт и долгот
#     lats = np.clip(lats, -90, 90)
#     lons = ((lons + 180) % 360) - 180
#
#     coords = [transform_coordinates(lat, lon, center_lat, center_lon)
#               for lat, lon in zip(lats, lons)]
#
#     # создаём Polygon и добавляем на карту
#     polygon = patches.Polygon(coords, closed=True, facecolor='green',
#                               alpha=0.3, edgecolor=None, zorder=0)
#     ax.add_patch(polygon)
