import os
from PIL import Image
import glob
import sys

def compress_images(folder_path):
    for filename in os.listdir(folder_path):
        if filename.endswith(".png") or filename.endswith(".jpg"):
            jpg = False
            if filename.endswith(".jpg"):
                jpg = True
            
            image_path = os.path.join(folder_path, filename)
            jpg_path = os.path.splitext(image_path)[0] + ".jpg"

            if os.path.exists(jpg_path) and not jpg:
                print(f"Error: {jpg_path} already exists. Skipping...")
                continue

            image = Image.open(image_path)
            width, height = image.size

            if width > 1024 or height > 1024:
                if not is_power_of_two(width) or not is_power_of_two(height):
                    print(f"Warning: {filename} resolution is not a power of two, image not scaled ({width}, {height}).")
                else:
                    if width == height:
                        image.thumbnail((1024, 1024))
                        print(f"Resized {filename} to 1024x1024")
                    else:
                        if width > height:
                            image.thumbnail((1024, height * 1024 // width))
                            print(f"Resized {filename} to 1024x{height * 1024 // width}")
                        else:
                            image.thumbnail((width * 1024 // height, 1024))
                            print(f"Resized {filename} to {width * 1024 // height}x1024")

                image.convert("RGB").save(jpg_path)
                print(f"Converted {filename} to {jpg_path}")
            else:
                if not is_power_of_two(width) or not is_power_of_two(height):
                    print(f"Warning: {filename} resolution is not a power of two ({width}, {height}).")

                if not jpg:
                    image.convert("RGB").save(jpg_path)
                    print(f"Converted {filename} to {jpg_path}")
                else:
                    print(f"{filename} is already a jpg and smaller than 1024x1024, skipping...")

def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

def replace_png_with_jpg(folder_path):
    mtl_files = glob.glob(os.path.join(folder_path, "**/*.mtl"), recursive=True)

    for mtl_file in mtl_files:
        with open(mtl_file, "r") as file:
            lines = file.readlines()

        with open(mtl_file, "w") as file:
            for line in lines:
                if line.startswith("map_Kd") or line.startswith("map_Ns") or line.startswith("map_Bump"):
                    if line.strip().endswith(".png"):
                        line = line.replace(".png", ".jpg")
                file.write(line)

def compress_in_subfolders(parent_folder):
    for root, dirs, files in os.walk(parent_folder):
        for dir in dirs:
            folder_path = os.path.join(root, dir)
            compress_images(folder_path)

def purge_png_files(folder_path):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".png"):
                os.remove(os.path.join(root, file))
                print(f"Deleted {file}")


if len(sys.argv) > 1 and sys.argv[1] != "--purge":
    folder_path = sys.argv[1]
else:
    folder_path = "."

compress_in_subfolders(folder_path)
compress_images(folder_path)
replace_png_with_jpg(folder_path)

if "--purge" in sys.argv:
    purge_png_files(folder_path)