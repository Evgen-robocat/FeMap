from flask import Flask, send_file
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
import io

app = Flask(__name__)

def generate_map():
    fig = plt.figure(figsize=(10, 5))
    ax = fig.add_subplot(1, 1, 1, projection=ccrs.Robinson())

    ax.set_global()

    # Цвет океана и суши
    ax.add_feature(cfeature.OCEAN, facecolor='lightsteelblue')
    ax.add_feature(cfeature.LAND, facecolor='beige')

    # Границы государств
    ax.add_feature(cfeature.BORDERS, edgecolor='gray')

    # Линии сетки
    ax.gridlines(draw_labels=True, color='gray', linestyle='--', linewidth=0.5)

    # Сохраняем в буфер
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return buf

@app.route("/")
def index():
    img_buf = generate_map()
    return send_file(img_buf, mimetype='image/png')

if __name__ == "__main__":
    # Для локального теста
    app.run(host="0.0.0.0", port=5000)
