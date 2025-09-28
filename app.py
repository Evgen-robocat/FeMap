from flask import Flask, render_template
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from datetime import datetime, timezone
from cartopy.feature.nightshade import Nightshade

try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

app = Flask(__name__)

# Настройки
LOCAL_TZ_NAME = "Europe/Kyiv"
LOCAL_TZ = ZoneInfo(LOCAL_TZ_NAME) if ZoneInfo else timezone.utc
MAP_PATH = os.path.join("static", "map.png")

def generate_map():
    os.makedirs("static", exist_ok=True)

    fig = plt.figure(figsize=(6, 6))
    try:
        proj = ccrs.AzimuthalEquidistant(central_longitude=0.0, central_latitude=90.0)
    except TypeError:
        proj = ccrs.NorthPolarStereo()

    ax = plt.axes(projection=proj)
    ax.set_global()
    try:
        ax.stock_img()
    except Exception:
        ax.background_patch.set_facecolor("lightsteelblue")
    ax.coastlines()

    # --- День/Ночь с использованием Cartopy Nightshade ---
    now_utc = datetime.now(timezone.utc)

    # День/ночь
    ax.add_feature(Nightshade(now_utc, alpha=0.4))
    # --- Заготовка для планет/звёзд ---
    # В будущем сюда будем добавлять точки: ax.plot(x, y, ...)

    plt.savefig(MAP_PATH, bbox_inches='tight', dpi=150)
    plt.close(fig)

@app.route("/")
def index():
    try:
        now_local = datetime.now(LOCAL_TZ)
    except Exception:
        now_local = datetime.now(timezone.utc)

    now_utc = datetime.now(timezone.utc)

    local_time = now_local.strftime("%Y-%m-%d %H:%M:%S %Z%z")
    utc_time = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC%z")

    # Генерируем карту каждый раз
    generate_map()

    return render_template("index.html", local_time=local_time, utc_time=utc_time,
                           center_lat=90, center_lon=0)

if __name__ == "__main__":
    app.run(debug=True)
