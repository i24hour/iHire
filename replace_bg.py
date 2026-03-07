import os
import re

def replace_backgrounds(content):
    # Replace bg-gray-900, bg-zinc-900 and their opacity variants with bg-black
    # This targets the main card backgrounds while leaving badges (usually 800) intact
    content = re.sub(r'bg-(gray|zinc)-900(?:/\d+)?', 'bg-black', content)
    return content

paths = []
for root, _, files in os.walk('frontend/src'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            paths.append(os.path.join(root, f))
            
for p in paths:
    with open(p, 'r') as f:
        content = f.read()
    
    new_content = replace_backgrounds(content)
    
    if new_content != content:
        with open(p, 'w') as f:
            f.write(new_content)
        print(f"Updated backgrounds in {p}")

