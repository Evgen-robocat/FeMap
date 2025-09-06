"""
animation.py
Анимация движения тел по времени с фиксированным центром
"""

import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from utils import get_subsolar_position, get_sublunar_position
from graphics import render_map_static
from datetime import datetime

def animate_time(config, start_dt: datetime, end_dt: datetime, steps: int):
    fig, ax = plt.subplots(figsize=config["figsize"], subplot_kw={'projection': 'polar'})

    times = [start_dt + i*(end_dt - start_dt)/steps for i in range(steps)]

    def update(frame):
        ax.clear()
        dt = times[frame]
        sun_lat, sun_lon = get_subsolar_position(dt)
        moon_lat, moon_lon = get_sublunar_position(dt)
        render_map_static(config, sun_lat, sun_lon, moon_lat, moon_lon)

    ani = FuncAnimation(fig, update, frames=steps, interval=200)
    ani.save(config["output_file"], writer='pillow', dpi=config["dpi"])
    plt.show()
