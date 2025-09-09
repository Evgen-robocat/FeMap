"""
config.py
Настройки проекта
"""

CONFIG = {
    "figsize": (6, 6),
    "dpi": 200,
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
