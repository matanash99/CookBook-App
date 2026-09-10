import os
import colorsys

categories = [
    "עוגות ועוגיות", "קינוחים", "עוף", "פשטידות", "פסטה", "אורז", "מאפים ולחמים", "ירקות",
    "טבעוני", "צמחוני", "בריאות", "אירוח", "חצי שעה", "סיר אחד", "בישול איטי", "ללא גלוטן",
    "בשר", "ריבות וחמוצים", "ממרחים ורטבים", "דגים", "חגים", "ארוחת בוקר", "משקאות",
    "שונות", "מרקים", "חלבי", "אסייתי", "סלטים"
]

# Generate elegant, deep, rich colors based on hash of the category name
def get_color(name):
    h = hash(name) % 360
    # Use golden ratio for distinct hues, keep saturation and value moderate for "editorial" look
    s = 0.6 + (hash(name + "s") % 100) / 500.0  # 0.6 - 0.8
    v = 0.3 + (hash(name + "v") % 100) / 400.0  # 0.3 - 0.55 (dark, rich)
    r, g, b = colorsys.hsv_to_rgb(h / 360.0, s, v)
    return f"rgb({int(r*255)}, {int(g*255)}, {int(b*255)})"

# Ensure directory exists
out_dir = r"c:\CookbookApp\CookBook-App\frontend\assets\categories"
os.makedirs(out_dir, exist_ok=True)

for cat in categories:
    color = get_color(cat)
    filename = cat.replace(" ", "-") + ".svg"
    filepath = os.path.join(out_dir, filename)
    
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="{color}" fill-opacity="0.50"/>
</svg>"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(svg_content)

print(f"Generated {len(categories)} SVG files in {out_dir}")
