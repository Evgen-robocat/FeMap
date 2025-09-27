"""
config.py
Настройки проекта
"""
from typing import Any
from datetime import datetime

# Дата и время старта
START_DATE = datetime(2025, 9, 17, 0, 0)

# Количество кадров и шаг в часах
FRAMES = 24
STEP_HOURS = 1

# Центр карты
CENTER_LAT = -90    # пример: Северный полюс
CENTER_LON = 0
# Фигура (размер)
figsize = (8, 8)

# Сохранять ли анимацию
SAVE = True
SAVE_FILENAME = "anim_time.gif"

CONFIG: dict[str | Any, tuple[int, int] | int | str | list[int | float] | Any] = {
    "figsize": (10, 10),
    "dpi": 300,
    "output_file": "polar_map.gif",
    "coastline_file": "data/coastline.txt",
    "cities_file": "data/worldcities.csv",
    "grid_step_lon": 30,
    "grid_step_lat": 30,
    "special_latitudes": [0, 23.5, -23.5, 66.5, -66.5],  # экватор, тропики, полярные круги
    "center_lat": 90,  # центр карты, можно менять
    "center_lon": 0,
    "title": "Полярная карта"
}
import matplotlib.pyplot as plt

def draw_projection(dt=None):
    fig, ax = plt.subplots(figsize=(8,8))

    # Здесь подключи свои расчёты положения Солнца/Луны с ephem
    # Для примера — временная заглушка:
    ax.plot([0,1,2],[0,1,0])
    ax.set_title(f"Проекция на {dt}" if dt else "Проекция на текущее время")

    return fig
