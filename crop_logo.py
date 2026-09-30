from PIL import Image
import sys

try:
    img = Image.open('src/assets/SimuCryto.png')
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        img.save('src/assets/SimuCryto.png')
        print("Cropped successfully!")
    else:
        print("Image is entirely transparent or bounding box not found.")
except Exception as e:
    print("Error:", e)
    sys.exit(1)
