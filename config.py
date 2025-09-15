"""
config.py
Настройки проекта
"""
from typing import Any

CONFIG: dict[str | Any, tuple[int, int] | int | str | list[int | float] | Any] = {
    "figsize": (10, 10),
    "dpi": 300,
    "output_file": "polar_map.gif",
    "coastline_file": "data/coastline.txt",
    "cities_file": "data/worldcities.csv",
    "grid_step_lon": 30,
    "grid_step_lat": 30,
    "special_latitudes": [0, 23.5, -23.5, 66.5, -66.5],  # экватор, тропики, полярные круги
    "center_lat": 0,  # центр карты, можно менять
    "center_lon": 45,
    "title": "Полярная карта"
}
