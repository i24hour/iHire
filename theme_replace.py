import os
import re

def replace_colors(content):
    # emerald -> zinc/white
    content = re.sub(r'from-emerald-900/50 to-green-900/50', 'from-zinc-900/50 to-zinc-900/50', content)
    content = re.sub(r'from-emerald-500 to-green-500', 'from-zinc-500 to-zinc-600', content)
    content = re.sub(r'bg-emerald-500/10', 'bg-white/10', content)
    content = re.sub(r'bg-emerald-500/20', 'bg-white/10', content)
    content = re.sub(r'border-emerald-500/30', 'border-white/20', content)
    content = re.sub(r'border-emerald-500/20', 'border-white/20', content)
    content = re.sub(r'border-emerald-500', 'border-white/50', content)
    content = re.sub(r'text-emerald-500/70', 'text-zinc-400', content)
    content = re.sub(r'text-emerald-400', 'text-white', content)
    content = re.sub(r'text-emerald-300', 'text-zinc-300', content)
    content = re.sub(r'bg-emerald-500', 'bg-white text-black', content)
    content = re.sub(r'shadow-emerald-500/50', 'shadow-white/20', content)
    content = re.sub(r'bg-emerald-950/20', 'bg-zinc-900/50', content)
    content = re.sub(r'border-emerald-900/30', 'border-zinc-800', content)
    content = re.sub(r'decoration-emerald-500', 'decoration-white/50', content)
    content = re.sub(r'ring-emerald-500/20', 'ring-white/20', content)

    # purple -> zinc/white
    content = re.sub(r'from-purple-900/50 to-pink-900/50', 'from-zinc-900/50 to-zinc-900/50', content)
    content = re.sub(r'from-purple-500 to-pink-500', 'from-zinc-500 to-zinc-600', content)
    content = re.sub(r'bg-purple-950/20', 'bg-zinc-900/50', content)
    content = re.sub(r'border-purple-900/30', 'border-zinc-800', content)
    content = re.sub(r'border-purple-500/30', 'border-white/20', content)
    content = re.sub(r'bg-purple-500/20', 'bg-white/10', content)
    content = re.sub(r'text-purple-500/70', 'text-zinc-400', content)
    content = re.sub(r'text-purple-400', 'text-white', content)
    content = re.sub(r'text-purple-300', 'text-zinc-300', content)
    content = re.sub(r'bg-purple-500', 'bg-white text-black', content)

    # amber -> zinc/white
    content = re.sub(r'from-amber-900/50 to-yellow-900/50', 'from-zinc-900/50 to-zinc-900/50', content)
    content = re.sub(r'from-amber-500 to-yellow-500', 'from-zinc-500 to-zinc-600', content)
    content = re.sub(r'border-amber-500/30', 'border-white/20', content)
    content = re.sub(r'text-amber-400', 'text-white', content)
    content = re.sub(r'text-amber-300', 'text-zinc-300', content)

    # red/rose -> zinc/white
    content = re.sub(r'from-red-900/50 to-rose-900/50', 'from-zinc-900/50 to-zinc-900/50', content)
    content = re.sub(r'from-red-500 to-orange-500', 'from-zinc-500 to-zinc-600', content)
    content = re.sub(r'border-red-500/30', 'border-white/20', content)
    content = re.sub(r'text-red-400', 'text-white', content)
    content = re.sub(r'text-red-300', 'text-zinc-300', content)

    # blue -> zinc/white
    content = re.sub(r'from-blue-900/50 to-indigo-900/50', 'from-zinc-900/50 to-zinc-900/50', content)
    content = re.sub(r'from-blue-500 to-indigo-500', 'from-zinc-500 to-zinc-600', content)
    content = re.sub(r'bg-blue-950/20', 'bg-zinc-900/50', content)
    content = re.sub(r'border-blue-900/30', 'border-zinc-800', content)
    content = re.sub(r'border-blue-500/30', 'border-white/20', content)
    content = re.sub(r'text-blue-500/70', 'text-zinc-400', content)
    content = re.sub(r'text-blue-400', 'text-white', content)
    content = re.sub(r'text-blue-300', 'text-zinc-300', content)
    content = re.sub(r'border-blue-500', 'border-white/50', content)
    content = re.sub(r'shadow-blue-500/50', 'shadow-white/20', content)

    return content

for root, _, files in os.walk('frontend/src/app'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            new_content = replace_colors(content)
            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Updated {path}")
