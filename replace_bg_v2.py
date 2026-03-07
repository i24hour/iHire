import os
import re

def replace_backgrounds(content):
    # This script aggressively replaces any non-black dark backgrounds with bg-black
    # and simplifies backdrop properties that don't make sense on a black background
    
    # 1. Replace soft blacks/grays with pure black
    content = re.sub(r'bg-(gray|zinc)-(800|900|950)(?:/\d+)?', 'bg-black', content)
    
    # 2. Remove backdrop blur and related classes as it only works on translucent bgs
    content = re.sub(r'backdrop-blur(?:-[a-z]+)?', '', content)
    
    # 3. Clean up translucent black borders
    content = re.sub(r'border-(gray|zinc)-(800|900)(?:/\d+)?', 'border-white/10', content)
    
    # 4. Clean up multiple spaces that might result from replacing things with empty strings
    content = re.sub(r'\s+', ' ', content)
    # Restore typical newline spacing for standard components (rough cleanup)
    content = content.replace('> <', '>\n<')
    content = content.replace('; ', ';\n')
    
    # Actually, a safer regex replacement to just swap the exact classes:
    return content

def safe_replace(content):
    # Safe class-by-class replacements
    
    # Backgrounds -> black
    content = re.sub(r'\bbg-(?:gray|zinc)-(?:800|900|950)(?:/\d+)?\b', 'bg-black', content)
    
    # Remove blur effects since background is solid black now
    content = re.sub(r'\bbackdrop-blur(?:-\w+)?\b', '', content)
    
    # Standardize borders to a faint white line for a stark B&W theme
    content = re.sub(r'\bborder-(?:gray|zinc)-(?:800|900)(?:/\d+)?\b', 'border-white/10', content)
    
    # Standardize inner panels / pills from gray-800 to minimal white outlines or pure black
    content = re.sub(r'\bbg-(?:gray|zinc)-(?:500|600|700)(?:/\d+)?\b', 'bg-white/5', content)
    
    return content

paths = []
for root, _, files in os.walk('frontend/src'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            paths.append(os.path.join(root, f))
            
for p in paths:
    with open(p, 'r') as f:
        content = f.read()
    
    new_content = safe_replace(content)
    
    if new_content != content:
        with open(p, 'w') as f:
            f.write(new_content)
        print(f"Updated backgrounds in {p}")

