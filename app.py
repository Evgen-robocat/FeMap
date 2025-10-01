"""
Flask-приложение для интерактивной полярной карты.

Маршруты:
- /        — отдаёт HTML-страницу с ползунками.
- /map     — возвращает PNG-картинку (параметры: ?lat=...&lon=...).

Код оформлен согласно PEP 8, с docstring и комментариями.
"""

import os
from io import BytesIO

from flask import Flask, request, render_template, send_file
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from cartopy.feature import NaturalEarthFeature

# Инициализация Flask-приложения
app = Flask(__name__)

# Значения по умолчанию для центра проекции
DEFAULT_LATITUDE = 90.0
DEFAULT_LONGITUDE = 0.0


def generate_polar_map(central_lat: float = DEFAULT_LATITUDE,
                       central_lon: float = DEFAULT_LONGITUDE) -> BytesIO:
    """
    Сгенерировать PNG-картинку карты в азимутальной эквидистантной
    проекции с указанным центром.

    :param central_lat: Latitude of projection center (degrees).
    :param central_lon: Longitude of projection center (degrees).
    :return: BytesIO с PNG-изображением.
    """
    # Создаём фигуру matplotlib
    fig = plt.figure(figsize=(8, 8))
    ax = fig.add_subplot(
        1, 1, 1,
        projection=ccrs.AzimuthalEquidistant(
            central_latitude=central_lat,
            central_longitude=central_lon
        )
    )

    # Добавляем океаны и сушу
    ax.add_feature(cfeature.OCEAN.with_scale("50m"), facecolor="lightblue")

    land = NaturalEarthFeature(
        category="physical",
        name="land",
        scale="50m",
        facecolor="tan",
        edgecolor="black"
    )
    ax.add_feature(land, alpha=0.85)

    # Побережья и границы
    ax.add_feature(cfeature.COASTLINE.with_scale("50m"), linewidth=0.5)
    ax.add_feature(cfeature.BORDERS.with_scale("50m"), linewidth=0.3)

    # Сетка широт/долгот
    ax.gridlines()

    # Сохранение рисунка в буфер памяти
    img_io = BytesIO()
    fig.savefig(img_io, format="png", dpi=120)
    plt.close(fig)
    img_io.seek(0)
    return img_io


@app.route("/map")
def map_png():
    """
    Маршрут для получения PNG-картинки карты.

    Ожидает GET-параметры:
      - lat (float): широта центра
      - lon (float): долгота центра

    Если параметры не указаны — используются значения по умолчанию.
    """
    lat = request.args.get("lat", default=DEFAULT_LATITUDE, type=float)
    lon = request.args.get("lon", default=DEFAULT_LONGITUDE, type=float)

    img_io = generate_polar_map(central_lat=lat, central_lon=lon)
    return send_file(img_io, mimetype="image/png")


@app.route("/")
def index():
    """
    Главная страница — отдаёт HTML-шаблон.
    Передаём значения по умолчанию, чтобы страница знала, какие
    координаты отображать при первоначальной загрузке.
    """
    return render_template(
        "index.html",
        default_lat=DEFAULT_LATITUDE,
        default_lon=DEFAULT_LONGITUDE
    )


if __name__ == "__main__":
    # Render/Heroku обычно задают PORT через переменную окружения.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
