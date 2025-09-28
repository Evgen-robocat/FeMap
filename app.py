import matplotlib

matplotlib.use('Agg')  # чтобы не требовался GUI
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature


def generate_map():
    # создаём фигуру и карту в проекции Робинсона
    fig = plt.figure(figsize=(12, 6))
    ax = fig.add_subplot(1, 1, 1, projection=ccrs.Robinson())

    # глобальный вид
    ax.set_global()

    # Заменяем background_patch на set_facecolor
    ax.set_facecolor("lightsteelblue")

    # добавляем границы стран
    ax.add_feature(cfeature.BORDERS, linewidth=0.5)
    ax.add_feature(cfeature.COASTLINE, linewidth=0.5)

    # пример: stock image карты (Cartopy)
    try:
        ax.stock_img()
    except Exception as e:
        print("Stock image не доступна:", e)

    # сохраняем в файл
    output_file = "static/map.png"
    fig.savefig(output_file, dpi=150, bbox_inches='tight')
    plt.close(fig)

    return output_file
