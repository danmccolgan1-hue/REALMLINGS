# v105: shrink painted leader portraits for embedding in the page.
# usage: python3 tools/portraits.py <folder with full-size "Title Name.jpg" files>   (writes portraits/<same name>.jpg, 240x360)
import sys, glob, os
from PIL import Image
src = sys.argv[1] if len(sys.argv) > 1 else '../portraits'
os.makedirs('portraits', exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*.jpg')) + glob.glob(os.path.join(src, '*.png'))):
    name = os.path.splitext(os.path.basename(f))[0]
    if name == 'contact_sheet': continue
    im = Image.open(f).convert('RGB'); w, h = im.size
    tw, th = 2, 3   # crop to 2:3, keeping the top
    if w * th > h * tw: nw = h * tw // th; im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else: nh = w * th // tw; im = im.crop((0, 0, w, nh))
    im.resize((240, 360), Image.LANCZOS).save(os.path.join('portraits', name + '.jpg'), quality=82, optimize=True)
    print('portrait', name)
