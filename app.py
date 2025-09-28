from flask import Flask, send_file, request
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from cartopy.feature import NaturalEarthFeature
from io import BytesIO

app = Flask(__name__)


def generate_polar_map(central_lat=90, central_lon=0):
    """
    Генерация карты в азимутальной эквидистантной проекции.
    central_lat, central_lon — центр проекции.
    Возвращает объект BytesIO с PNG.
    """
    fig = plt.figure(figsize=(10, 10))
    ax = fig.add_subplot(
        1, 1, 1,
        projection=ccrs.AzimuthalEquidistant(central_latitude=central_lat,
                                             central_longitude=central_lon)
    )

    # Океан
    ax.add_feature(cfeature.OCEAN.with_scale('50m'), facecolor='lightblue')

    # Суша
    land = NaturalEarthFeature(
        category='physical', name='land', scale='50m',
        facecolor='saddlebrown', edgecolor='darkgreen'
    )
    ax.add_feature(land, alpha=0.7)

    # Побережья и границы
    ax.add_feature(cfeature.COASTLINE.with_scale('50m'), linewidth=0.5)
    ax.add_feature(cfeature.BORDERS.with_scale('50m'), linewidth=0.3)

    # Сетка широт/долгот
    ax.gridlines()

    # Сохраняем в BytesIO
    img_io = BytesIO()
    fig.savefig(img_io, format='png', dpi=150, bbox_inches='tight')
    plt.close(fig)
    img_io.seek(0)
    return img_io


@app.route('/')
def index():
    # Позволяем менять центр через GET параметры, например ?lat=90&lon=0
    lat = request.args.get('lat', default=90, type=float)
    lon = request.args.get('lon', default=0, type=float)

    img_io = generate_polar_map(central_lat=lat, central_lon=lon)
    return send_file(img_io, mimetype='image/png', download_name='polar_map.png')


if __name__ == '__main__':
    # Render сам назначает порт через $PORT
    import os

    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
