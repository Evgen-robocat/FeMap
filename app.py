from flask import Flask, send_file
import matplotlib

matplotlib.use('Agg')  # чтобы не требовался GUI
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
from io import BytesIO

app = Flask(__name__)


def generate_map():
    # Создаем фигуру
    fig = plt.figure(figsize=(8, 8))

    # Азимутальная равноудаленная проекция, центр на Северном полюсе
    ax = fig.add_subplot(
        1, 1, 1,
        projection=ccrs.AzimuthalEquidistant(central_longitude=0, central_latitude=90)
    )

    # Глобальные границы и сетка
    ax.set_global()
    ax.gridlines(draw_labels=True, linewidth=0.5, color='gray', alpha=0.7, linestyle='--')

    # Цвет фона (например, вода)
    ax.background_img = None  # отключаем текстуру
    ax.set_facecolor("lightsteelblue")

    # Пример: наносим границы стран
    ax.add_feature(ccrs.feature.BORDERS, linewidth=0.5)

    # Сохраняем в буфер
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)  # Закрываем фигуру, чтобы не накапливались
    buf.seek(0)
    return buf


@app.route("/")
def index():
    img_buf = generate_map()
    return send_file(img_buf, mimetype='image/png')


if __name__ == "__main__":
    app.run()
