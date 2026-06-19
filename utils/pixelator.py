import sys
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse
import numpy as np
from PIL import Image, ImageEnhance
import requests
from requests import RequestException
import os
from pillow_heif import register_heif_opener
from transparent_background import Remover

register_heif_opener()

# check if image url has been given in run command
if len(sys.argv) < 2:
    raise Exception("\033[31m[ERROR] Please provide image URL/path in run command.\033[0m")

# CONFIGURATION PARAMETERS
IMAGE_SOURCE = sys.argv[1] # copy the image url/path to a variable
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "tmp" # repo-relative tmp path
BLOCK_SIZE = 4
PALETTE_SIZE = 1
SIZE = 256 # fixed height in all pixelated images
VIBRANCY = 1 # color saturation multiplier
ALPHA_KEEP_THRESHOLD = 150 # pixels below this alpha become fully transparent
REMOVEBG = True

bgRemover = Remover()

# OPEN IMAGE
parsed_source = urlparse(IMAGE_SOURCE)
input_path = Path(IMAGE_SOURCE).expanduser()

if parsed_source.scheme in {"http", "https"}:
    try:
        response = requests.get(
            IMAGE_SOURCE,
            headers={
                "User-Agent": "Mozilla/5.0 PixelOrbit/1.0",
                "Accept": "image/*,*/*;q=0.8",
            },
            timeout=20,
        )
        response.raise_for_status()
    except RequestException as exc:
        raise Exception(f"\033[31m[ERROR] Failed to fetch image with URL {IMAGE_SOURCE}.\n{exc}\033[0m") from exc

    imgRaw = Image.open(BytesIO(response.content)).convert("RGBA") # open image
elif input_path.is_file():
    imgRaw = Image.open(input_path).convert("RGBA") # open local image
else:
    raise Exception(f"\033[31m[ERROR] Input is neither a valid URL nor an existing file path: {IMAGE_SOURCE}\033[0m")

print(f"\033[34mFormat: {imgRaw.format}, Size: {imgRaw.size}, Mode: {imgRaw.mode}\033[0m")

# REMOVE BACKGROUND
if REMOVEBG:
    imgCutout = bgRemover.process(imgRaw.convert("RGB"), type="rgba")
    if isinstance(imgCutout, np.ndarray):
        imgCutout = Image.fromarray(imgCutout)
    if not isinstance(imgCutout, Image.Image):
        raise TypeError("\033[31m[ERROR] Background remover returned an unsupported image type.\033[0m")
    imgCutout = imgCutout.convert("RGBA")
else:
    imgCutout = imgRaw

# CROP
bbox = imgCutout.getbbox() # get non transparent object boundaries
if bbox is None:
    raise ValueError("\033[31m[ERROR] No visible foreground remained after background removal.\033[0m")
imgCutout = imgCutout.crop(bbox) # crop image to bbox

# PIXELIZE AND RESIZE
if (imgCutout.width > imgCutout.height):
    targetWidth = SIZE
    targetHeight = int(imgCutout.height * SIZE / imgCutout.width)
else:
    targetWidth = int(imgCutout.width * SIZE / imgCutout.height)
    targetHeight = SIZE

pixelWidth = max(1, targetWidth // BLOCK_SIZE)
pixelHeight = max(1, targetHeight // BLOCK_SIZE)
imgPixel = imgCutout.resize((pixelWidth, pixelHeight), Image.Resampling.NEAREST)
imgPixel = imgPixel.resize((targetWidth, targetHeight), Image.Resampling.NEAREST)

alpha = imgPixel.getchannel("A") # get alpha channel (transparency)
alphaArray = np.array(alpha)
alphaArray[alphaArray < ALPHA_KEEP_THRESHOLD] = 0
alphaArray[alphaArray >= ALPHA_KEEP_THRESHOLD] = 255
alpha = Image.fromarray(alphaArray, "L")
imgPixelRGB = ImageEnhance.Color(imgPixel.convert("RGB")).enhance(VIBRANCY)
imgPixelRGB = imgPixelRGB.quantize(colors=PALETTE_SIZE).convert("RGBA")
imgPixelRGB.putalpha(alpha)
imgPixel = imgPixelRGB

# SAVE IMG
OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
fileIdx = sum(1 for entry in os.scandir(OUTPUT_PATH) if entry.is_file()) # check how many files exist in the output dir
imgPixel.save(OUTPUT_PATH / f"img{fileIdx}.png") # save the image as img{index}.png
imgPixel.show()
