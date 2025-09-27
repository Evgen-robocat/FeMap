import cartopy.crs as ccrs
from cartopy.io import srtm
import matplotlib.pyplot as plt
from cartopy.io import PostprocessedRasterSource, LocatedImage

def shade(located_elevations):
    new_img = srtm.add_shading(located_elevations.image,
                               azimuth=135, altitude=15)
    return LocatedImage(new_img, located_elevations.extent)

fig = plt.figure(figsize=(10, 10))
ax = fig.add_subplot(111, projection=ccrs.PlateCarree())

# Использование данных SRTM и добавление теневого рельефа
shaded_srtm = PostprocessedRasterSource(srtm.SRTM3Source(), shade)
ax.add_raster(shaded_srtm, cmap='Greys')

ax.set_extent([-180, 180, -90, 90])
plt.show()
