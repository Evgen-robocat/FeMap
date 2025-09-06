"""
main.py
Статичная карта с центром на экваторе, Солнцем и зоной видимости (день/ночь)
"""

from datetime import datetime
from graphics import render_map_static
from utils import get_subsolar_position

# --- Конфигурация ---
CONFIG = {
    "center_lat": 0,           # Экватор
    "center_lon": 0,
    "figsize": (6, 6),
    "dpi": 200,
    "output_file": "map_static.png",
    "grid_step_lon": 30,
    "special_latitudes": [66.5, 23.5, -23.5, -66.5],  # Полярные круги и тропики
}

# Время наблюдения
dt = datetime(2025, 9, 7, 12, 0, 0)

# Получаем позицию Солнца
sun_lat, sun_lon = get_subsolar_position(dt)

# Подготовка объектов для отображения
objects = [
    {"lat": sun_lat, "lon": sun_lon, "marker": "*", "color": "orange", "label": "Солнце"},
]

# Отображаем карту
render_map_static(CONFIG, objects, show_daylight=True)
