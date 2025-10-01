"""
Flask-приложение для отображения карты
в азимутальной эквидистантной проекции с возможностью
изменять центр через ползунки (широта/долгота).
"""

from flask import Flask, send_file, request, render_template
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from cartopy.feature import NaturalEarthFeature
from io import BytesIO
import os

# Инициализация приложения Flask
app = Flask(__name__)


def generate_polar_map(central_lat=90, central_lon=0):
    """
    Создаёт карту в азимутальной эквидистантной проекции.

    :param central_lat: float — широта центра проекции
    :param central_lon: float — долгота центра проекции
    :return: BytesIO — картинка в формате PNG
    """
    # Создаём фигуру matplotlib
    fig = plt.figure(figsize=(8, 8))

    # Добавляем ось с проекцией
    ax = fig.add_subplot(
        1, 1, 1,
        projection=ccrs.AzimuthalEquidistant(
            central_latitude=central_lat,
            central_longitude=central_lon
        )
    )

    # Добавляем океаны
    ax.add_feature(
        cfeature.OCEAN.with_scale("50m"),
        facecolor="lightblue"
    )

    # Добавляем сушу (цвет + границы)
    land = NaturalEarthFeature(
        category="physical",
        name="land",
        scale="50m",
        facecolor="tan",
        edgecolor="black"
    )
    ax.add_feature(land, alpha=0.8)

    # Побережья и границы стран
    ax.add_feature(
        cfeature.COASTLINE.with_scale("50m"),
        linewidth=0.5
    )
    ax.add_feature(
        cfeature.BORDERS.with_scale("50m"),
        linewidth=0.3
    )

    # Сетка широт и долгот
    ax.gridlines()

    # Сохраняем картинку в буфер памяти
    img_io = BytesIO()
    fig.savefig(img_io, format="png", dpi=120)
    plt.close(fig)
    img_io.seek(0)

    return img_io


@app.route("/map")
def map_png():
    """
    Маршрут для генерации карты (PNG).
    Получает параметры ?lat=...&lon=...
    """
    lat = request.args.get("lat", default=90, type=float)
    lon = request.args.get("lon", default=0, type=float)

    img_io = generate_polar_map(
        central_lat=lat,
        central_lon=lon
    )

    return send_file(img_io, mimetype="image/png")


@app.route("/")
def index():
    """
    Главная страница с HTML-шаблоном (ползунки + карта).
    """
    return render_template("index.html")


if __name__ == "__main__":
    # Render сам задаёт порт через переменную окружения $PORT
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
