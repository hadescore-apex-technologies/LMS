"""Remove white/light background from logo and make it truly transparent PNG."""
from PIL import Image
import sys

def remove_bg(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        # Calculate brightness (0=black, 255=white)
        brightness = (r + g + b) / 3
        # If pixel is light/white (brightness > 200) AND not strongly colored
        # Also remove near-white, light gray, off-white pixels
        max_channel = max(r, g, b)
        min_channel = min(r, g, b)
        saturation = max_channel - min_channel  # Color saturation
        
        if brightness > 190 and saturation < 80:
            # Light, unsaturated pixel = background, make transparent
            new_data.append((r, g, b, 0))
        elif brightness > 220 and saturation < 100:
            # Very light pixel even with some color
            new_data.append((r, g, b, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    
    # Crop to remove empty transparent borders
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    
    img.save(output_path, "PNG")
    print(f"Done! Saved transparent logo ({img.size[0]}x{img.size[1]}) to {output_path}")

if __name__ == "__main__":
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    remove_bg(input_file, output_file)
