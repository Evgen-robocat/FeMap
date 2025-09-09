"""
utils.py
Вспомогательные функции:
- преобразование координат
- загрузка материков и городов
- вычисление положения Солнца и Луны
"""

import numpy as np
import csv
import ephem
from typing import List, Tuple, Dict


def transform_coordinates(lat: float, lon: float,
                          center_lat: float, center_lon: float) -> Tuple[float, float]:
    """
    Преобразует широту и долготу в полярные координаты относительно центра карты.

    :param lat: широта точки (°)
    :param lon: долгота точки (°)
    :param center_lat: центр карты (широта, °)
    :param center_lon: центр карты (долгота, °)
    :return: (r, theta) в радианах и градусах
    """
    lat_rad = np.radians(lat)
    lon_rad = np.radians(lon)
    center_lat_rad = np.radians(center_lat)
    center_lon_rad = np.radians(center_lon)

    x = np.cos(lat_rad) * np.cos(lon_rad - center_lon_rad)
    y = np.cos(lat_rad) * np.sin(lon_rad - center_lon_rad)
    z = np.sin(lat_rad)

    new_lat = np.arcsin(z * np.sin(center_lat_rad) + x * np.cos(center_lat_rad))
    new_lon = np.arctan2(y, x * np.sin(center_lat_rad) - z * np.cos(center_lat_rad))

    r = 90 - np.degrees(new_lat)
    theta = np.radians(np.degrees(new_lon) % 360)
    return r, theta


def load_continents_from_txt(file_path: str) -> List[List[Tuple[float, float]]]:
    """
    Загружает контуры материков из текстового файла.

    Пустая строка = новый материк.

    :param file_path: путь к .txt файлу
    :return: список материков, каждый — список (lat, lon)
    """
    continents = []
    current_continent = []

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:  # новый материк
                if current_continent:
                    continents.append(current_continent)
                    current_continent = []
                continue
            lat_str, lon_str = line.split(",")
            lat, lon = float(lat_str), float(lon_str)
            current_continent.append((lat, lon))
        if current_continent:
            continents.append(current_continent)

    return continents


def load_cities_from_csv(file_path: str) -> List[Dict]:
    """
    Загружает города из CSV.

    CSV должен содержать колонки: city, lat, lon

    :param file_path: путь к CSV файлу
    :return: список городов [{"name":..., "lat":..., "lon":...}]
    """
    cities = []
    with open(file_path, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            cities.append({
                "name": row["city"],
                "lat": float(row["lat"]),
                "lon": float(row["lng"])
            })
    return cities


def get_subsolar_position(dt) -> Tuple[float, float]:
    """
    Вычисляет субсолярную точку (широта, долгота) для заданной даты.

    :param dt: datetime объект
    :return: (lat, lon) в градусах
    """
    sun = ephem.Sun(dt)
    lat = np.degrees(sun.dec)
    lon = np.degrees(sun.ra)  # грубое приближение
    return lat, lon


def get_moon_position(dt) -> Tuple[float, float]:
    """
    Вычисляет положение Луны (широта, долгота) для заданной даты.

    :param dt: datetime объект
    :return: (lat, lon) в градусах
    """
    moon = ephem.Moon(dt)
    lat = np.degrees(moon.dec)
    lon = np.degrees(moon.ra)  # грубое приближение
    return lat, lon
