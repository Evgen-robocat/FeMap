"""
main.py
Пример использования всех слоёв карты с возможностью закомментировать ненужные
"""

import matplotlib.pyplot as plt
from datetime import datetime
from config import CONFIG
from graphics import draw_grid, draw_continents, draw_cities, draw_sun, draw_moon, draw_daylight
from utils import get_subsolar_position, get_moon_position, load_continents_from_txt, load_cities_from_csv

# Создаём фигуру
plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=CONFIG["figsize"], subplot_kw={'projection':'polar'})
center_lat = CONFIG["center_lat"]
center_lon = CONFIG["center_lon"]
# --- Настройка осей ---

ax.set_theta_zero_location('S')
ax.set_theta_direction(1)
ax.set_ylim(0, 180)
ax.set_xticks([])        # убираем подписи меридианов
ax.set_yticks([])        # убираем подписи радиусов
ax.grid(False)           # отключаем сетку matplotlib
ax.spines['polar'].set_visible(False)  # убираем рамку
# --- Сетка ---
draw_grid(ax,center_lat, center_lon)

# --- Линии берегов с файла ---
draw_continents(ax, filename="data/coastline.txt",
                center_lat=center_lat, center_lon=center_lon)

# --- Города ---
#cities = load_cities_from_csv(CONFIG["cities_file"])
#draw_cities(ax, cities, center_lat, center_lon)

# --- Солнце и дневная зона ---
#dt = datetime(2025, 9, 21, 12, 0, 0)
#sun_lat, sun_lon = get_subsolar_position(dt)
#draw_sun(ax, sun_lat, sun_lon, center_lat, center_lon)
#draw_daylight(ax, sun_lat, sun_lon)

# --- Луна ---
# moon_lat, moon_lon = get_moon_position(dt)
# draw_moon(ax, moon_lat, moon_lon, center_lat, center_lon)

ax.set_title(CONFIG["title"])
plt.show()
