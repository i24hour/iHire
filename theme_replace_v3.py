import os
import re

def replace_generic_colors(content):
    colors = r'(emerald|purple|red|amber|green|pink|blue|yellow|rose|indigo|teal)'

    # Text colors
    content = re.sub(rf'text-{colors}-400', 'text-white', content)
    content = re.sub(rf'text-{colors}-500/?\d*', 'text-white', content)
    content = re.sub(rf'text-{colors}-300', 'text-zinc-300', content)
    
    # Backgrounds
    content = re.sub(rf'bg-{colors}-500/20', 'bg-white/10', content)
    content = re.sub(rf'bg-{colors}-500/10', 'bg-white/5', content)
    content = re.sub(rf'bg-{colors}-950/20', 'bg-zinc-900/50', content)
    content = re.sub(rf'bg-{colors}-900/50', 'bg-zinc-900/50', content)
    content = re.sub(rf'bg-{colors}-500/?\d*', 'bg-white/10', content)
    content = re.sub(rf'bg-{colors}-600', 'bg-zinc-800', content)
    content = re.sub(rf'bg-{colors}-700', 'bg-zinc-700', content)

    # Gradients
    content = re.sub(rf'from-{colors}-\d+/?\d*', 'from-zinc-900/50', content)
    content = re.sub(rf'to-{colors}-\d+/?\d*', 'to-zinc-900/50', content)
    content = re.sub(rf'via-{colors}-\d+/?\d*', 'via-zinc-900/50', content)

    # Borders
    content = re.sub(rf'border-{colors}-\d+/?\d*', 'border-white/20', content)

    # Shadows & Rings & Decorations
    content = re.sub(rf'shadow-{colors}-500/50', 'shadow-white/20', content)
    content = re.sub(rf'ring-{colors}-500/20', 'ring-white/20', content)
    content = re.sub(rf'ring-{colors}-\d+', 'ring-white/50', content)
    content = re.sub(rf'decoration-{colors}-\d+', 'decoration-white/50', content)
    
    # Specific side bar tubelight
    content = content.replace('shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-emerald-500/50 text-emerald-400 bg-emerald-500/10', 'shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/30 text-white bg-white/10')

    return content

paths = []
for root, _, files in os.walk('frontend/src'):
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
