import sys
from io import BytesIO
from pathlib import Path
from PIL import Image
import requests
import rembg
import os

# check if image url has been given in run command
if len(sys.argv) < 2:
    raise Exception("\033[31m[ERROR] Please provide image URL in run command.\033[0m")

# CONFIGURATION PARAMETERS
IMAGE_URL = sys.argv[1] # copy the image url to a variable
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "output" / "pixelatedImages" # repo-relative output path
BLOCK_SIZE = 16
PALETTE_SIZE = 10
SIZE = 256 # fixed height in all pixelated images

# DOWNLOAD IMAGE
response = requests.get(IMAGE_URL) # fetch image

if response.status_code == 200:
    imgRaw = Image.open(BytesIO(response.content)).convert("RGBA") # open image
else:
    # Raise an error if image failed to fetch
    raise Exception(f"\033[31m[ERROR] Failed to fetch image with URL {IMAGE_URL}.\nReceived status code {response.status_code}.\033[0m")

print(f"\033[34mFormat: {imgRaw.format}, Size: {imgRaw.size}, Mode: {imgRaw.mode}\033[0m") # (debug)
imgRaw.show() # (test)

# REMOVE BACKGROUND
imgCutout = rembg.remove(imgRaw).convert("RGBA") # type: ignore

# CROP
bbox = imgCutout.getbbox() # get non transparent object boundaries
imgCutout = imgCutout.crop(bbox) # crop image to bbox

# PIXELIZE AND RESIZE
if (imgCutout.width > imgCutout.height):
    imgPixel = imgCutout.resize((SIZE, int(imgCutout.height * SIZE / imgCutout.width)), Image.Resampling.NEAREST)
else:
    imgPixel = imgCutout.resize((int(imgCutout.width * SIZE / imgCutout.height), SIZE), Image.Resampling.NEAREST)

alpha = imgPixel.getchannel("A") # get alpha channel (transparency)
imgPixelRGB = imgPixel.convert("RGB").quantize(colors=PALETTE_SIZE).convert("RGBA")
imgPixelRGB.putalpha(alpha)
imgPixel = imgPixelRGB

# SAVE IMG
OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
fileIdx = sum(1 for entry in os.scandir(OUTPUT_PATH) if entry.is_file()) # check how many files exist in the output dir
imgPixel.save(OUTPUT_PATH / f"img{fileIdx}.png") # save the image as img{index}.png
imgPixel.show()
