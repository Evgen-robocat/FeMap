import matplotlib

matplotlib.use('Agg')  # Используем бэкенд без GUI для работы на сервере
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from io import BytesIO
from flask import Flask, send_file, request

app = Flask(__name__)


def generate_map(central_longitude=0, central_latitude=90):
    """
    Генерирует карту в азимутальной эквидистантной проекции.

    central_longitude: долгота центра карты
    central_latitude: широта центра карты
    """
    fig = plt.figure(figsize=(8, 8))

    # Азимутальная эквидистантная проекция
    ax = fig.add_subplot(
        1, 1, 1,
        projection=ccrs.AzimuthalEquidistant(
            central_longitude=central_longitude,
            central_latitude=central_latitude
        )
    )

    # Добавляем цвета суши и воды
    ax.add_feature(cfeature.LAND, facecolor='lightgray')
    ax.add_feature(cfeature.OCEAN, facecolor='lightblue')

    # Добавляем побережья и границы
    ax.add_feature(cfeature.COASTLINE)
    ax.add_feature(cfeature.BORDERS, linestyle=':')

    # Ограничиваем видимую область (50° широты до полюса)
    ax.set_extent([-180, 180, 50, 90], crs=ccrs.PlateCarree())

    # Сетка широт и меридианов
    gl = ax.gridlines(draw_labels=True, linewidth=1, color='green', alpha=0.5, linestyle='--')
    gl.top_labels = False
    gl.right_labels = False

    # Сохраняем картинку в буфер
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf


@app.route('/')
def index():
    """
    Основной маршрут:
    Можно передавать параметры ?lon=...&lat=... для изменения центра карты.
    """
    lon = request.args.get('lon', default=0, type=float)
    lat = request.args.get('lat', default=90, type=float)
    buf = generate_map(central_longitude=lon, central_latitude=lat)
    return send_file(buf, mimetype='image/png')


if __name__ == '__main__':
    app.run(debug=True)
