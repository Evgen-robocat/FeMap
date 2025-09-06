"""
graphics.py
Функции для рисования карты и объектов
"""

import matplotlib.pyplot as plt
import numpy as np
from utils import transform_coordinates


def render_map_static(config, objects=None, show_daylight=False):
    """
    Рисует статичную карту.
    - objects: список объектов {"lat":..., "lon":..., "marker":..., "color":..., "label":...}
    - show_daylight: True — закрашивает дневную зону вокруг Солнца
    """
    fig, ax = plt.subplots(figsize=config["figsize"], subplot_kw={'projection': 'polar'})
    ax.set_theta_zero_location('S')
    ax.set_theta_direction(1)
    ax.set_ylim(0, 180)
    ax.set_xticks([])
    ax.set_yticks([])

    center_lat = config["center_lat"]
    center_lon = config["center_lon"]

    # Сетка
    for lon in range(0, 360, config["grid_step_lon"]):
        theta = np.radians(lon)
        ax.plot([theta, theta], [0, 180], color='lightgray', lw=0.4)
    for lat in config["special_latitudes"]:
        r = 90 - lat
        ax.plot(np.linspace(0, 2 * np.pi, 360), [r]*360, color='green', linestyle='--', lw=0.8)

    # День/ночь (если нужно)
    if show_daylight:
        # ищем Солнце в списке объектов
        sun_obj = next((obj for obj in objects if obj.get("label") == "Солнце"), None)
        if sun_obj:
            sun_lat = sun_obj["lat"]
            sun_lon = sun_obj["lon"]
            theta_vals = np.linspace(0, 2 * np.pi, 360)
            r_vals = np.linspace(0, 180, 180)
            Theta, R = np.meshgrid(theta_vals, r_vals)
            lat_grid = 90 - R
            lon_grid = np.degrees(Theta)
            angle = np.arccos(
                np.sin(np.radians(sun_lat)) * np.sin(np.radians(lat_grid)) +
                np.cos(np.radians(sun_lat)) * np.cos(np.radians(lat_grid)) *
                np.cos(np.radians(lon_grid - sun_lon))
            )
            daylight_mask = angle < np.pi / 2  # дневная зона
            ax.pcolormesh(Theta, R, daylight_mask, shading='auto', cmap='YlOrBr', alpha=0.3, zorder=0)

    # Рисуем объекты
    if objects:
        for obj in objects:
            r, theta = transform_coordinates(obj["lat"], obj["lon"], center_lat, center_lon)
            ax.scatter(theta, r, marker=obj.get("marker", "o"),
                       color=obj.get("color", "black"),
                       label=obj.get("label", None), zorder=10)

    # Легенда и заголовок
    if objects:
        ax.legend(loc='upper right', fontsize=8)
    ax.set_title(f"Центр карты: {center_lat}°, {center_lon}°", fontsize=10)

    # Сохраняем картинку
    fig.savefig(config["output_file"], dpi=config["dpi"])
    plt.show()
