from flask import Flask, send_file
import os
import matplotlib

matplotlib.use('Agg')  # Важный момент: серверный рендер без GUI
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature

app = Flask(__name__)

# Путь для сохранения карты
MAP_FILE = "static/map.png"
os.makedirs("static", exist_ok=True)


def generate_map():
    fig = plt.figure(figsize=(10, 5))
    ax = fig.add_subplot(1, 1, 1, projection=ccrs.Robinson())

    # Цвет "океана"
    ax.set_facecolor("lightsteelblue")

    # Границы континентов и страны
    ax.add_feature(cfeature.LAND, facecolor='lightgreen')
    ax.add_feature(cfeature.OCEAN, facecolor='lightsteelblue')
    ax.add_feature(cfeature.BORDERS, edgecolor='gray')
    ax.add_feature(cfeature.COASTLINE)

    # Глобальная карта
    ax.set_global()

    # stock_img использует scipy/pykdtree
    try:
        ax.stock_img()
    except Exception as e:
        print("Stock image skipped:", e)

    # Сохраняем в файл
    fig.savefig(MAP_FILE, bbox_inches='tight')
    plt.close(fig)
    return MAP_FILE


@app.route('/')
def index():
    # Генерируем карту
    generate_map()
    # Отправляем как файл
    return send_file(MAP_FILE, mimetype='image/png')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
