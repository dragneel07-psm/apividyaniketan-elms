import re
reqs = open("requirements.txt").read().split('\n')
clean_reqs = []
for req in reqs:
    clean_reqs.append(req)

with open("requirements.txt", "w") as f:
    r = '\n'.join(reqs)
    f.write(f"setuptools\n{r}")
with open("backend/requirements.txt", "w") as f:
    f.write(f"setuptools\n{r}")
