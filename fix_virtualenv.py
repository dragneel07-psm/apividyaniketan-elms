lines = open("requirements.txt").read().split('\n')
with open("requirements.txt", "w") as f:
    for line in lines:
        if line.startswith("virtualenv=="): continue
        f.write(line + "\n")
with open("backend/requirements.txt", "w") as f:
    for line in lines:
        if line.startswith("virtualenv=="): continue
        f.write(line + "\n")
