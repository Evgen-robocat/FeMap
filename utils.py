"""
utils.py
Функции для преобразования координат и получения положения Солнца
"""

import numpy as np
import ephem
from datetime import datetime
from typing import Tuple


def transform_coordinates(lat: float, lon: float, center_lat: float, center_lon: float) -> Tuple[float, float]:
    """
    Преобразует широту и долготу в полярные координаты относительно центра карты.
    Возвращает r, theta (в радианах)
    """
    lat_rad, lon_rad = np.radians(lat), np.radians(lon)
    center_lat_rad, center_lon_rad = np.radians(center_lat), np.radians(center_lon)

    x = np.cos(lat_rad) * np.cos(lon_rad - center_lon_rad)
    y = np.cos(lat_rad) * np.sin(lon_rad - center_lon_rad)
    z = np.sin(lat_rad)

    new_lat = np.arcsin(z * np.sin(center_lat_rad) + x * np.cos(center_lat_rad))
    new_lon = np.arctan2(y, x * np.sin(center_lat_rad) - z * np.cos(center_lat_rad))

    r = 90 - np.degrees(new_lat)
    theta = np.radians(np.degrees(new_lon) % 360)
    return r, theta


def get_subsolar_position(dt: datetime) -> Tuple[float, float]:
    """
    Возвращает широту и долготу подсолнечной точки (субсолярную)
    """
    obs = ephem.Observer()
    obs.date = dt
    sun = ephem.Sun(obs)
    lat = np.degrees(sun.dec)
    gst = obs.sidereal_time()
    lon = np.degrees(sun.ra - gst)
    lon = (lon + 180) % 360 - 180
    return lat, lon
