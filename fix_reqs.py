import re

content = open("requirements.txt").read()
# packages to unpin
packages_to_unpin = ['numpy', 'pandas', 'matplotlib', 'contourpy', 'kiwisolver', 'jupyter', 'jupyter-core', 'jupyter-client', 'jupyter-server', 'notebook', 'nbconvert', 'nbformat', 'nbclassic', 'nbclient', 'ipykernel', 'ipython', 'pyzmq', 'tornado', 'traitlets']

lines = content.split('\n')
new_lines = []
for line in lines:
    unpinned = False
    for p in packages_to_unpin:
        if line.lower().startswith(p.lower() + '=='):
            new_lines.append(p)
            unpinned = True
            break
    if not unpinned:
        new_lines.append(line)

open("requirements.txt", "w").write('\n'.join(new_lines))
open("backend/requirements.txt", "w").write('\n'.join(new_lines))
