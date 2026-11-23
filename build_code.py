import sys
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "project-code.md"
LANG = {".py": "python", ".html": "html", ".md": "markdown", ".txt": "text"}
SKIP = {"__pycache__", ".git", ".venv", "venv", "node_modules", "restored"}
FENCE = "````"  # four backticks so files containing ``` stay intact


def build():
    parts = ["# Project code"]
    for f in sorted(ROOT.rglob("*")):
        rel = f.relative_to(ROOT)
        if not f.is_file() or f == OUT or f.suffix not in LANG or SKIP & set(rel.parts):
            continue
        text = f.read_text(encoding="utf-8").rstrip()
        parts.append(f"## {rel.as_posix()}\n\n{FENCE}{LANG[f.suffix]}\n{text}\n{FENCE}")
    OUT.write_text("\n\n".join(parts) + "\n", encoding="utf-8")
    print(f"{len(parts) - 1} files -> {OUT.name}")


def unbuild(target):
    target = Path(target).resolve()
    path, lines, count = None, None, 0
    for line in OUT.read_text(encoding="utf-8").splitlines():
        if lines is None:
            if line.startswith("## "):
                path = line[3:]
            elif line.startswith(FENCE) and path:
                lines = []
        elif line == FENCE:
            dest = (target / path).resolve()
            if target not in dest.parents:
                sys.exit(f"Unsafe path: {path}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text("\n".join(lines) + "\n", encoding="utf-8")
            path, lines, count = None, None, count + 1
        else:
            lines.append(line)
    print(f"{count} files -> {target}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "build":
        build()
    elif cmd == "unbuild":
        unbuild(sys.argv[2] if len(sys.argv) > 2 else "restored")
    else:
        sys.exit("Usage: python build_code.py build | unbuild [target_dir]")