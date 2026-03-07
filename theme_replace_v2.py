import os
import re

def replace_generic_colors(content):
    # Colors to replace
    colors = r'(emerald|purple|red|amber|green|pink|blue|yellow|rose|indigo|teal)'

    # Text colors
    content = re.sub(rf'text-{colors}-400', 'text-white', content)
    content = re.sub(rf'text-{colors}-500', 'text-white', content)
    content = re.sub(rf'text-{colors}-300', 'text-zinc-300', content)
    
    # Backgrounds
    content = re.sub(rf'bg-{colors}-500/20', 'bg-white/10', content)
    content = re.sub(rf'bg-{colors}-500/10', 'bg-white/5', content)
    content = re.sub(rf'bg-{colors}-950/20', 'bg-zinc-900/50', content)
    content = re.sub(rf'bg-{colors}-900/50', 'bg-zinc-900/50', content)
    content = re.sub(rf'bg-{colors}-500', 'bg-white text-black', content)
    content = re.sub(rf'bg-{colors}-400', 'bg-zinc-300', content)

    # Gradients
    content = re.sub(rf'from-{colors}-\d+/?\d*', 'from-zinc-900', content)
    content = re.sub(rf'to-{colors}-\d+/?\d*', 'to-zinc-900', content)
    content = re.sub(rf'via-{colors}-\d+/?\d*', 'via-zinc-900', content)

    # Borders
    content = re.sub(rf'border-{colors}-500/30', 'border-white/20', content)
    content = re.sub(rf'border-{colors}-500/20', 'border-white/20', content)
    content = re.sub(rf'border-{colors}-900/30', 'border-zinc-800', content)
    content = re.sub(rf'border-{colors}-500', 'border-white/50', content)

    # Shadows & Rings & Decorations
    content = re.sub(rf'shadow-{colors}-500/50', 'shadow-white/20', content)
    content = re.sub(rf'ring-{colors}-500/20', 'ring-white/20', content)
    content = re.sub(rf'decoration-{colors}-500', 'decoration-white/50', content)

    return content

paths = []
for root, _, files in os.walk('frontend/src/app'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            paths.append(os.path.join(root, f))
            
for p in paths:
    with open(p, 'r') as f:
        content = f.read()
    
    new_content = replace_generic_colors(content)
    
    if new_content != content:
        with open(p, 'w') as f:
            f.write(new_content)
        print(f"Updated colors in {p}")
