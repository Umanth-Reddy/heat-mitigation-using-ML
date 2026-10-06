import os
import re

from .paths import DATA

PATH = os.path.join(DATA, "SOURCES.md")
HEADER = "# Data sources\n\nEvery dataset used by the ML pipeline, with where and when it was fetched. Sections are written by the scripts.\n"


def write_section(key: str, text: str) -> None:
    """Replace (or append) the section between <!-- key --> markers in ml/data/SOURCES.md."""
    body = open(PATH, encoding="utf-8").read() if os.path.exists(PATH) else HEADER
    block = f"<!-- {key} -->\n{text.strip()}\n<!-- /{key} -->"
    pattern = re.compile(rf"<!-- {re.escape(key)} -->.*?<!-- /{re.escape(key)} -->", re.S)
    body = pattern.sub(lambda _: block, body) if pattern.search(body) else body.rstrip() + "\n\n" + block + "\n"
    with open(PATH, "w", encoding="utf-8") as f:
        f.write(body)
