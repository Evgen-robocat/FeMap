from flask import Flask, render_template, request, send_file
import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from graphics import draw_continents
import ephem
import datetime
import numpy as np

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/map")
def map_image():
    # читаем параметры центра из запроса
    lat = float(request.args.get("lat", 90))   # центр широта
    lon = float(request.args.get("lon", 0))    # центр долгота

    show_sun = request.args.get("sun", "false") == "true"
    show_moon = request.args.get("moon", "false") == "true"
    show_iss = request.args.get("iss", "false") == "true"

    fig, ax = plt.subplots(figsize=(10,10), subplot_kw={'polar': True})
    ax.set_theta_zero_location('S')
    ax.set_theta_direction(1)
    ax.set_ylim(0, 180)
    ax.set_xticks([])  # убираем подписи меридианов
    ax.set_yticks([])  # убираем подписи радиусов
    ax.grid(False)  # отключаем сетку matplotlib
    ax.spines['polar'].set_visible(True)  # не убираем рамку

    # рисуем материки
    draw_continents(ax, filename="data/coastline.txt",
                    center_lat=lat, center_lon=lon,
                    color="black", lw=0.5)

    # текущее время UTC
    now = datetime.datetime.now()

    # === Солнце ===
    if show_sun:
        sun = ephem.Sun(now)
        sun_lat = float(sun.dec) * 180/np.pi
        sun_lon = float(sun.ra) * 180/np.pi - 180
        ax.plot(np.radians(sun_lon), 90 - sun_lat, "yo", markersize=10, label="Солнце")

    # === Луна ===
    if show_moon:
        moon = ephem.Moon(now)
        moon_lat = float(moon.dec) * 180/np.pi
        moon_lon = float(moon.ra) * 180/np.pi - 180
        ax.plot(np.radians(moon_lon), 90 - moon_lat, "wo", markersize=8, label="Луна")

    # === МКС ===
    if show_iss:
        # Упростим: задаём орбиту ГСО ~400 км
        # В будущем можно подключить TLE
        iss_lat = 0   # заглушка: экватор
        iss_lon = (now.second * 6) % 360 - 180  # двигается по долготе
        ax.plot(np.radians(iss_lon), 90 - iss_lat, "ro", markersize=6, label="МКС")

    ax.legend(loc="lower left", fontsize=8)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=100)
    plt.close(fig)
    buf.seek(0)
    return send_file(buf, mimetype="image/png")

if __name__ == "__main__":
    app.run(debug=True)
