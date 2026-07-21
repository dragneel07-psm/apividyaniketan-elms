import re

# Read original requirements
with open("requirements.txt", "r") as f:
    lines = f.read().splitlines()

# Words to ban completely
ban_words = [
    "jupyter", "nbclassic", "nbclient", "nbconvert", "nbformat", 
    "notebook", "ipykernel", "ipython", "ipywidgets", "qtconsole", 
    "qtpy", "pyzmq", "tornado", "traitlets", "nest-asyncio",
    "comm", "argon2", "send2trash", "terminado", "prometheus_client",
    "argon2-cffi-bindings", "argon2-cffi", "bleach", "defusedxml", "pandocfilters",
    "jinja2", "markupsafe", "mistune", "debugpy", "asttokens", "executing", "pure-eval", "stack-data",
    "parso", "jedi", "pexpect", "ptyprocess", "pickleshare", "prompt-toolkit", "pygments", "wcwidth",
    "appnope", "backcall", "decorator", "matplotlib-inline", "fastjsonschema", "jsonschema",
    "pyrsistent", "virtualenv", "distlib", "filelock"
]

# Exact packages to unpin because they are incompatible with Python 3.12 
# (we will let pip resolve the versions)
unpin_words = [
    "numpy", "pandas", "matplotlib", "contourpy", "kiwisolver", "scipy", "setuptools"
]

new_lines = []
for line in lines:
    line = line.strip()
    if not line:
        continue
    
    pkg_name = line.split("==")[0].lower()
    
    # Check if banned
    banned = sum(1 for w in ban_words if w.lower() in pkg_name)
    if banned > 0:
        continue

    # Unpin if needed
    unpin = False
    for uw in unpin_words:
        if uw.lower() == pkg_name:
            unpin = True
            break
    
    if unpin:
        new_lines.append(pkg_name)
    else:
        new_lines.append(line)

new_content = "\n".join(new_lines) + "\n"

with open("requirements.txt", "w") as f:
    f.write(new_content)

with open("backend/requirements.txt", "w") as f:
    f.write(new_content)

print(f"Wrote {len(new_lines)} lines to requirements.txt")
