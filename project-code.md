# Project code

## app.py

````python
﻿import io
import html
import re
import zipfile
from pathlib import Path

from bs4 import BeautifulSoup
from flask import Flask, abort, render_template, request, send_file
from markdown import markdown as render_md
from markdown_pdf import MarkdownPdf, Section
from markitdown import MarkItDown
from pypdf import PdfReader, PdfWriter
from werkzeug.utils import secure_filename

app = Flask(__name__)
md = MarkItDown()
TEMPLATE = Path(__file__).with_name("template.html").read_text(encoding="utf-8")

TOOLS = [
    {"slug": "merge", "name": "Merge PDF", "tags": "pdf", "desc": "Combine PDFs in a chosen order"},
    {"slug": "split", "name": "Split PDF", "tags": "pdf", "desc": "Extract page ranges"},
    {"slug": "pdf-to-md", "name": "PDF to Markdown", "tags": "pdf md", "desc": "Extract text as Markdown"},
    {"slug": "md-to-html", "name": "MD to HTML", "tags": "md html", "desc": "Build one HTML from MD files"},
    {"slug": "html-to-md", "name": "HTML to MD", "tags": "html md", "desc": "Split HTML into MD files"},
    {"slug": "merge-md", "name": "Merge MD", "tags": "md", "desc": "Combine MD files into one"},
    {"slug": "split-md", "name": "Split MD", "tags": "md", "desc": "Split one MD by # titles"},
    {"slug": "md-to-pdf", "name": "MD to PDF", "tags": "md pdf", "desc": "Render MD files as one PDF"},
]


def parse_ranges(text, total):
    pages = []
    for part in text.split(","):
        a, _, b = part.strip().partition("-")
        start, end = int(a), int(b or a)
        if not 1 <= start <= end <= total:
            raise ValueError(f"Invalid range: {part.strip()} (PDF has {total} pages)")
        pages += range(start - 1, end)
    return pages


def pdf_response(writer):
    out = io.BytesIO()
    writer.write(out)
    out.seek(0)
    return send_file(out, mimetype="application/pdf")


@app.get("/")
def index():
    return render_template("home.html", tools=TOOLS)


@app.get("/tool/<slug>")
def tool(slug):
    t = next((t for t in TOOLS if t["slug"] == slug), None)
    if t is None:
        abort(404)
    return render_template("tool.html", tool=t, tools=TOOLS)


@app.get("/guide")
def guide():
    text = Path(__file__).with_name("README.md").read_text(encoding="utf-8")
    return render_template("guide.html", content=render_md(text, extensions=["fenced_code"]))


@app.post("/merge")
def merge():
    writer = PdfWriter()
    for f in request.files.getlist("files"):
        writer.append(PdfReader(f.stream))
    return pdf_response(writer)


@app.post("/split")
def split():
    reader = PdfReader(request.files["file"].stream)
    try:
        pages = parse_ranges(request.form["ranges"], len(reader.pages))
    except ValueError as e:
        return str(e), 400
    writer = PdfWriter()
    for i in pages:
        writer.add_page(reader.pages[i])
    return pdf_response(writer)


@app.post("/markdown")
def markdown():
    f = request.files["file"]
    text = md.convert_stream(io.BytesIO(f.read()), file_extension=".pdf").markdown
    return text, 200, {"Content-Type": "text/plain; charset=utf-8"}


@app.post("/md-to-html")
def md_to_html():
    nav, content = [], []
    for i, f in enumerate(request.files.getlist("files")):
        body = render_md(f.read().decode("utf-8"), extensions=["fenced_code", "tables"])
        nav.append(f'<a href="#doc-{i}">{html.escape(Path(f.filename).stem)}</a>')
        content.append(f'<section class="doc" id="doc-{i}">{body}</section>')
    vals = {
        "TITLE": html.escape(request.form["title"] or "Documents"),
        "NAV": "\n".join(nav),
        "CONTENT": "\n".join(content),
    }
    return re.sub(r"\{\{(TITLE|NAV|CONTENT)\}\}", lambda m: vals[m[1]], TEMPLATE)


@app.post("/html-to-md")
def html_to_md():
    soup = BeautifulSoup(request.files["file"].read(), "html.parser")
    sections = soup.select("section.doc") or [soup.body or soup]
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        for i, s in enumerate(sections, 1):
            link = soup.select_one(f'nav a[href="#{s["id"]}"]') if s.get("id") else None
            name = secure_filename(link.get_text(strip=True)) if link else "doc"
            text = md.convert_stream(io.BytesIO(str(s).encode()), file_extension=".html").markdown
            z.writestr(f"{i:02}_{name}.md", text)
    out.seek(0)
    return send_file(out, mimetype="application/zip", download_name="docs.zip")


@app.post("/merge-md")
def merge_md():
    texts = [f.read().decode("utf-8").strip() for f in request.files.getlist("files")]
    out = io.BytesIO(("\n\n".join(texts) + "\n").encode())
    return send_file(out, mimetype="text/markdown", download_name="merged.md", as_attachment=True)


@app.post("/split-md")
def split_md():
    parts, fence = [], False
    for line in request.files["file"].read().decode("utf-8").splitlines():
        if line.startswith("```"):
            fence = not fence
        if line.startswith("# ") and not fence:
            parts.append([line])
        elif parts:
            parts[-1].append(line)
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as z:
        for i, p in enumerate(parts, 1):
            name = secure_filename(p[0][2:]) or "doc"
            z.writestr(f"{i:02}_{name}.md", "\n".join(p).strip() + "\n")
    out.seek(0)
    return send_file(out, mimetype="application/zip", download_name="split.zip")


@app.post("/md-to-pdf")
def md_to_pdf():
    pdf = MarkdownPdf()
    for f in request.files.getlist("files"):
        pdf.add_section(Section(f.read().decode("utf-8"), toc=False))
    out = io.BytesIO()
    pdf.save_bytes(out)
    out.seek(0)
    return send_file(out, mimetype="application/pdf")


if __name__ == "__main__":
    app.run(host="127.0.0.1", debug=True)
````

## build_code.py

````python
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
````

## commands.md

````markdown
# Commands

Activate the virtual environment (Anaconda PowerShell Prompt on Windows):

```bash
conda activate my-python-env
```


Install the required Python packages:

```bash
pip install -r requirements.txt
```

Run the Flask application:

```bash
python app.py
```

Open your web browser and navigate to:

```bash
http://127.0.0.1:5000
```

Build all project files into `project-code.md`:

```bash
python build_code.py build
```

Restore the files from `project-code.md` into the `restored` folder (or another folder):

```bash
python build_code.py unbuild
python build_code.py unbuild some_folder
```
````

## company-laptop-python.md

````markdown
# Python on a Corporate Device: Miniconda, VS Code, and Isolated Environments

## Current setup

- Python distribution: **Miniconda / Anaconda (corporate package)**
- Base installation: `C:\ProgramData\miniconda3`
- Base Python executable: `C:\ProgramData\miniconda3\python.exe`
- Terminal in VS Code: **Anaconda PowerShell**
- Corporate Conda packages are downloaded through the internal `conda-virtual` repository
- The `base` environment is centrally managed and read-only
- Custom environments are typically stored in `C:\Users\SD7FB\.conda\envs`

> **Important:** Do not install packages into the `base` environment. Use a separate isolated environment `my-python-env`

---

## 1. Open the correct terminal in VS Code

In VS Code, open:

```text
Terminal -> New Terminal
```

Select this terminal profile:

```text
Anaconda PowerShell
```

Verify the active Python interpreter:

```powershell
python --version
python -c "import sys; print(sys.executable)"
```

The expected path should be similar to:

```text
C:\Users\SD7FB\.conda\envs\my-python-env\python.exe
```

### Deactivate the environment

```powershell
conda deactivate
```

### List environments

```powershell
conda env list
```

### Remove an environment that is no longer needed

Deactivate the environment first, and then run:

```powershell
conda remove --name my-python-env --all
```

---

> Do not store passwords, API tokens, credentials, or sensitive production data in the projects.

---

## 4. Select the interpreter in VS Code

After opening the project:

1. Press `Ctrl + Shift + P`.
2. Select `Python: Select Interpreter`.
3. Select the interpreter from `my-python-env`.

Expected path:

```text
C:\Users\SD7FB\.conda\envs\my-python-env\python.exe
```

If the environment is not listed, use:

```text
Python: Select Interpreter -> Enter interpreter path
```

Then select the appropriate `python.exe` file.

---

## 5. Install packages

Before installing anything, confirm that the terminal prompt starts with the name of your environment:

```text
(my-python-env)
```

---

## 6. Conda versus pip

Use this practical process:

1. First, try to install the package from the corporate Conda channel:

```powershell
conda install PACKAGE_NAME
```

2. If the package is not available in the Conda repository, use pip inside the active environment:

```powershell
python -m pip install PACKAGE_NAME
```

Prefer `python -m pip` over the standalone `pip` command. This ensures that the package is installed into the Python interpreter belonging to the active environment.

### List installed packages

```powershell
conda list
python -m pip list
```

### Show information about a pip package

```powershell
python -m pip show pypdf
```

---

## 7. Save project dependencies

### pip dependencies

```powershell
python -m pip freeze > requirements.txt
```

Restore the dependencies:

```powershell
python -m pip install -r requirements.txt
```

### Conda environment

Recommended concise export containing explicitly selected packages:

```powershell
conda env export --from-history > environment.yml
```

Restore the environment:

```powershell
conda env create -f environment.yml
```

---

## 8. Security rules for the corporate device

- Use the corporate Miniconda installation and internal package repository.
- Do not disable TLS/SSL verification to work around download errors.
- Do not use `--trusted-host` to bypass security controls.
- Do not add random public Conda channels without corporate approval.
- Check package names carefully before installation. A misspelled name can lead to a typosquatting package.
- Before using a package in a work project, verify its source, license, and compliance with corporate policy.
- Do not upload internal documents, source code, or data to personal cloud storage

---

## 9. Quick daily workflow

Verify the interpreter:

```powershell
python -c "import sys; print(sys.executable)"
```

Run the program:

```powershell
python .\src\main.py
```

At the end of work:

```powershell
conda deactivate
```

---

## 10. Troubleshooting

### `python` or `conda` is not recognized

Open the **Anaconda PowerShell** profile in VS Code instead of a regular PowerShell or Command Prompt terminal.

### VS Code uses the wrong Python interpreter

Use:

```text
Ctrl + Shift + P -> Python: Select Interpreter
```

Select the Python executable from:

```text
C:\Users\SD7FB\.conda\envs\my-python-env\python.exe
```

### A package is installed but its import fails

Compare the selected interpreter with the package location:

```powershell
python -c "import sys; print(sys.executable)"
python -m pip show PACKAGE_NAME
```

Both should point to the same environment.

### Certificate or proxy error

Do not disable SSL verification. Save the error message without credentials and send it to the Service Desk or the team responsible for the corporate Python/Artifactory setup.

---

## Quick reference

```powershell
# Create an environment
conda create -n my-python-env python=3.13

# Activate it
conda activate my-python-env

# Install packages
conda install numpy
python -m pip install pypdf

# Verify the selected Python interpreter
python -c "import sys; print(sys.executable)"

# Run a script
python .\src\main.py

# Export dependencies
conda env export --from-history > environment.yml
python -m pip freeze > requirements.txt

# Deactivate the environment
conda deactivate
```
````

## README.md

````markdown
# PDF App

Local Flask app for PDF and document conversion. Runs on `127.0.0.1` only.

## Tech stack

- Flask: web framework
- pypdf: merge and split PDFs
- MarkItDown: PDF/HTML to Markdown
- Markdown: Markdown to HTML
- BeautifulSoup: HTML parsing

## Commands

```powershell
conda activate my-python-env
pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000.

## Project files

- `app.py`: routes and tool list (`TOOLS`)
- `template.html`: page template used by MD to HTML. Keep it next to `app.py`.
- `templates/`: Flask pages. One file per tool in `templates/tools/`.

To add a tool, add an entry to `TOOLS`, create `templates/tools/<slug>.html` and add a route.

## User guide

The home page lists all tools. Filter them by `pdf`, `md` or `html`, then click a card to open a tool.

On a tool page the sidebar groups all tools by category (`pdf`, `html`, `md`). Click a category name to collapse or expand it. A tool with several tags appears in each category. The search box filters the tools by name.

Top right: **User Guide** opens this document, **Light / Dark** switches the theme and remembers it.

Results of Merge PDF, Split PDF, PDF to Markdown and MD to HTML open in a new tab. Merge MD, Split MD and HTML to MD download a file. **Clear** resets a form.

### Merge PDF

1. Click the file input and pick PDFs. Repeat to add more.
2. Reorder with the up/down arrows. Remove a file with the x button.
3. Click **Merge**. The result opens in a new tab.

**Clear** empties the list.

### Split PDF

1. Pick one PDF.
2. Enter page ranges, e.g. `3-5, 8-10` or `4`. Pages are 1-based.
3. Click **Split**. One PDF with the selected pages, in the given order, opens in a new tab.

An out-of-range value returns an error.

### PDF to Markdown

1. Pick one PDF.
2. Click **Convert**. The Markdown text opens in a new tab.

Only text PDFs work. Scanned PDFs without OCR return nothing.

### MD to HTML

1. Optionally enter a title.
2. Pick one or more `.md` files.
3. Click **Convert**. One HTML page opens in a new tab, built from `template.html`. Each file becomes a section with a link in the navigation.

Save it with Ctrl+S.

### HTML to MD

1. Pick an HTML file generated by MD to HTML (the original file, not a page saved from the browser).
2. Click **Convert**. A ZIP downloads with one `.md` file per section, e.g. `01_name.md`.

An HTML file without sections is converted to a single `.md`.

### Merge MD

1. Pick two or more `.md` files.
2. Click **Merge**. `merged.md` downloads with the files joined in the selected order. Each file keeps its own `# title`.

### Split MD

1. Pick one `.md` file.
2. Click **Split**. A ZIP downloads with one `.md` file per top-level `# title`, e.g. `01_title.md`.

Text before the first `# title` is dropped. `#` lines inside code blocks are ignored.

### MD to PDF

1. Pick one or more `.md` files.
2. Click **Convert**. One PDF opens in a new tab. Each file starts on a new page.
````

## requirements.txt

````text
flask
pypdf
markitdown[pdf]
markdown
markdown-pdf
````

## template.html

````html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{TITLE}}</title>
    <script>
      (function () {
        let theme = null;
        try {
          theme = localStorage.getItem("theme");
        } catch (error) {}
        if (!theme)
          theme = matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        document.documentElement.dataset.theme = theme;
      })();
    </script>
    <style>
      :root {
        --bg: #ffffff;
        --text: #1c2530;
        --nav-bg: #fafbfc;
        --nav-hover: #e8eef5;
        --accent: #1f5f99;
        --border: #d6dde5;
        --muted: #5b6672;
        --code-bg: #f3f5f8;
        color-scheme: light;
      }
      :root[data-theme="dark"] {
        --bg: #14181d;
        --text: #dde3ea;
        --nav-bg: #1a1f26;
        --nav-hover: #263040;
        --accent: #6db3f2;
        --border: #333c47;
        --muted: #98a3b0;
        --code-bg: #20262e;
        color-scheme: dark;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        background: var(--bg);
        color: var(--text);
        line-height: 1.55;
        display: flex;
        min-height: 100vh;
      }
      nav {
        width: 260px;
        flex-shrink: 0;
        border-right: 1px solid var(--border);
        padding: 24px 16px;
        position: sticky;
        top: 0;
        height: 100vh;
        overflow-y: auto;
        background: var(--nav-bg);
      }
      #theme-toggle {
        width: 100%;
        margin: 0 0 12px;
        padding: 6px 8px;
        font: inherit;
        font-size: 13px;
        color: var(--text);
        background: var(--code-bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
      }
      nav h1 {
        font-size: 15px;
        margin: 0 0 16px;
      }
      #search {
        margin: 0 0 12px;
      }
      #search-input {
        width: 100%;
        padding: 6px 8px;
        font: inherit;
        font-size: 13px;
        color: var(--text);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
      }
      #search-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
        font-size: 12px;
        color: var(--muted);
      }
      #search-count {
        flex: 1;
      }
      #search-controls button {
        padding: 1px 8px;
        font: inherit;
        color: var(--text);
        background: var(--code-bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
      }
      nav a[hidden] {
        display: none;
      }
      mark.search-hit {
        background: #ffe066;
        color: #000;
      }
      mark.search-hit.current {
        background: #ff9632;
        outline: 2px solid #ff9632;
      }
      nav a {
        display: block;
        padding: 6px 8px;
        color: var(--accent);
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
      }
      nav a:hover {
        background: var(--nav-hover);
      }
      main {
        flex: 1;
        max-width: 960px;
        padding: 24px 40px 80px;
      }
      section.doc {
        padding-bottom: 32px;
        margin-bottom: 32px;
        border-bottom: 2px solid var(--border);
      }
      h1 {
        font-size: 26px;
        margin-top: 0;
      }
      h2 {
        font-size: 20px;
        margin-top: 28px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 4px;
      }
      h3 {
        font-size: 16px;
        margin-top: 20px;
      }
      a {
        color: var(--accent);
      }
      table {
        border-collapse: collapse;
        margin: 12px 0;
        width: 100%;
        font-size: 14px;
      }
      th,
      td {
        border: 1px solid var(--border);
        padding: 6px 10px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: var(--code-bg);
      }
      code {
        background: var(--code-bg);
        padding: 1px 5px;
        border-radius: 3px;
        font-family: Consolas, monospace;
        font-size: 13px;
      }
      pre {
        background: var(--code-bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 12px;
        overflow-x: auto;
      }
      pre code {
        background: none;
        padding: 0;
      }
      pre {
        position: relative;
      }
      .copy-code {
        position: absolute;
        top: 6px;
        right: 6px;
        padding: 2px 8px;
        font: inherit;
        font-size: 12px;
        color: var(--text);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        opacity: 0.75;
      }
      .copy-code:hover {
        opacity: 1;
      }
      .meta {
        color: var(--muted);
      }
      img {
        max-width: 100%;
        height: auto;
        border: 1px solid var(--border);
      }
      @media (max-width: 800px) {
        body {
          display: block;
        }
        nav {
          position: static;
          width: auto;
          height: auto;
        }
        main {
          padding: 16px;
        }
      }
    </style>
  </head>
  <body>
    <nav>
      <h1>{{TITLE}}</h1>
      <button id="theme-toggle" type="button">Switch theme</button>
      <div id="search">
        <input
          id="search-input"
          type="search"
          placeholder="Search in documents"
          autocomplete="off"
        />
        <div id="search-controls">
          <span id="search-count"></span>
          <button id="search-prev" type="button" title="Previous (Shift+Enter)">
            &uarr;
          </button>
          <button id="search-next" type="button" title="Next (Enter)">
            &darr;
          </button>
        </div>
      </div>
      {{NAV}}
    </nav>
    <main>{{CONTENT}}</main>
    <script>
      (function () {
        const root = document.documentElement;
        const button = document.getElementById("theme-toggle");
        const label = () => {
          button.textContent =
            root.dataset.theme === "dark" ? "Light mode" : "Dark mode";
        };
        button.addEventListener("click", () => {
          root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
          try {
            localStorage.setItem("theme", root.dataset.theme);
          } catch (error) {}
          label();
        });
        label();
      })();
      document.querySelectorAll("pre").forEach((block) => {
        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "copy-code";
        copyButton.textContent = "Copy";
        copyButton.addEventListener("click", () => {
          const text = block.querySelector("code").textContent;
          const done = () => {
            copyButton.textContent = "Copied";
            setTimeout(() => (copyButton.textContent = "Copy"), 1500);
          };
          const fallback = () => {
            const area = document.createElement("textarea");
            area.value = text;
            document.body.appendChild(area);
            area.select();
            document.execCommand("copy");
            area.remove();
            done();
          };
          if (navigator.clipboard && window.isSecureContext)
            navigator.clipboard.writeText(text).then(done, fallback);
          else fallback();
        });
        block.appendChild(copyButton);
      });
      (function () {
        const main = document.querySelector("main");
        const input = document.getElementById("search-input");
        const count = document.getElementById("search-count");
        const sections = [...document.querySelectorAll("section.doc")];
        const navLinks = [...document.querySelectorAll("nav a")];
        const MIN_LENGTH = 2;
        let marks = [];
        let current = -1;
        let timer;

        const clearMarks = () => {
          main.querySelectorAll("mark.search-hit").forEach((mark) => {
            mark.replaceWith(document.createTextNode(mark.textContent));
          });
          main.normalize();
        };

        const highlight = (query) => {
          const needle = query.toLowerCase();
          const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) =>
              node.parentElement.closest("button, script, style")
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
          });
          const nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);

          for (const node of nodes) {
            const text = node.nodeValue;
            const lower = text.toLowerCase();
            let index = lower.indexOf(needle);
            if (index === -1) continue;

            const fragment = document.createDocumentFragment();
            let last = 0;
            while (index !== -1) {
              fragment.append(text.slice(last, index));
              const mark = document.createElement("mark");
              mark.className = "search-hit";
              mark.textContent = text.slice(index, index + needle.length);
              fragment.append(mark);
              last = index + needle.length;
              index = lower.indexOf(needle, last);
            }
            fragment.append(text.slice(last));
            node.replaceWith(fragment);
          }

          return [...main.querySelectorAll("mark.search-hit")];
        };

        const go = (index) => {
          if (marks.length === 0) return;
          if (current >= 0) marks[current].classList.remove("current");
          current = (index + marks.length) % marks.length;
          marks[current].classList.add("current");
          marks[current].scrollIntoView({ block: "center" });
          count.textContent = `${current + 1} / ${marks.length}`;
        };

        const search = () => {
          clearMarks();
          marks = [];
          current = -1;
          navLinks.forEach((link) => (link.hidden = false));

          const query = input.value.trim();
          if (query.length < MIN_LENGTH) {
            count.textContent = query ? `Type ${MIN_LENGTH}+ characters` : "";
            return;
          }

          marks = highlight(query);
          sections.forEach((section) => {
            const link = navLinks.find(
              (item) => item.getAttribute("href") === `#${section.id}`,
            );
            if (link) link.hidden = !section.querySelector("mark.search-hit");
          });
          count.textContent = marks.length === 0 ? "No matches" : "";
          go(0);
        };

        input.addEventListener("input", () => {
          clearTimeout(timer);
          timer = setTimeout(search, 200);
        });
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter")
            go(event.shiftKey ? current - 1 : current + 1);
          if (event.key === "Escape") {
            input.value = "";
            search();
          }
        });
        document
          .getElementById("search-next")
          .addEventListener("click", () => go(current + 1));
        document
          .getElementById("search-prev")
          .addEventListener("click", () => go(current - 1));
      })();
    </script>
  </body>
</html>
````

## templates/base.html

````html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  const root = document.documentElement;
  const dark = localStorage.theme
    ? localStorage.theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", dark);
</script>
<style>
  .dark .bg-gray-100 {
    background: #111827;
    color: #e5e7eb;
  }
  .dark .bg-white {
    background: #1f2937;
    color: #e5e7eb;
  }
  .dark .bg-gray-300 {
    background: #374151;
    color: #e5e7eb;
  }
  .dark .text-gray-600 {
    color: #9ca3af;
  }
  .dark .hover\:bg-gray-100:hover {
    background: #374151;
  }
  .dark input {
    border-color: #4b5563;
  }
</style>
<body class="bg-gray-100 min-h-screen flex">
  <button
    onclick="
      localStorage.theme = root.classList.toggle('dark') ? 'dark' : 'light'
    "
    class="fixed top-3 right-3 bg-gray-300 px-3 py-1 rounded"
  >
    Light / Dark
  </button>
  <a
    href="/guide"
    title="User guide"
    class="fixed top-3 right-32 bg-gray-300 px-3 py-1 rounded"
    >User Guide</a
  >
  {% if tool %}
  <aside class="w-64 bg-white p-4 shadow space-y-3">
    <a href="/" class="font-bold block">All tools</a>
    <input
      id="q"
      placeholder="Search tools"
      class="w-full border rounded px-2 py-1"
    />
    <div id="nav" class="space-y-2">
      {% for cat in ["pdf", "html", "md"] %}
      <details open>
        <summary class="text-xs uppercase text-gray-600 cursor-pointer">
          {{ cat }}
        </summary>
        <ul class="space-y-1 mt-1">
          {% for t in tools if cat in t.tags.split() %}
          <li>
            <a
              href="/tool/{{ t.slug }}"
              class="block px-2 py-1 rounded hover:bg-gray-100 {{ 'font-bold bg-gray-100' if t.slug == tool.slug }}"
              >{{ t.name }}</a
            >
          </li>
          {% endfor %}
        </ul>
      </details>
      {% endfor %}
    </div>
  </aside>
  <script>
    q.oninput = () => {
      const s = q.value.toLowerCase();
      nav
        .querySelectorAll("li")
        .forEach(
          (li) => (li.hidden = !li.textContent.toLowerCase().includes(s)),
        );
      nav.querySelectorAll("details").forEach((d) => {
        d.hidden = !d.querySelector("li:not([hidden])");
        if (s) d.open = true;
      });
    };
  </script>
  {% endif %}
  <main class="flex-1 flex p-6 pt-16">
    <div class="m-auto w-full {{ 'max-w-md' if tool else 'max-w-4xl' }}">
      {% block body %}{% endblock %}
    </div>
  </main>
</body>
````

## templates/guide.html

````html
{% extends "base.html" %} {% block body %}
<style>
  .guide h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }
  .guide h2 {
    font-size: 1.35rem;
    font-weight: 700;
    margin: 1.25rem 0 0.5rem;
  }
  .guide h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 1rem 0 0.4rem;
  }
  .guide p,
  .guide ul,
  .guide ol,
  .guide pre {
    margin-bottom: 0.75rem;
  }
  .guide ul {
    list-style: disc;
    padding-left: 1.5rem;
  }
  .guide ol {
    list-style: decimal;
    padding-left: 1.5rem;
  }
  .guide code {
    background: #e5e7eb;
    padding: 0 0.25rem;
    border-radius: 0.25rem;
  }
  .guide pre {
    background: #e5e7eb;
    padding: 0.75rem;
    border-radius: 0.25rem;
    overflow-x: auto;
  }
  .guide pre code {
    background: none;
    padding: 0;
  }
  .guide a {
    color: #2563eb;
    text-decoration: underline;
  }
  .dark .guide code,
  .dark .guide pre {
    background: #374151;
  }
</style>
<div class="guide bg-white p-6 rounded shadow">
  <a href="/" title="All tools" class="inline-block mb-4">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  </a>
  {{ content|safe }}
</div>
{% endblock %}
````

## templates/home.html

````html
{% extends "base.html" %} {% block body %}
<h1 class="text-2xl font-bold mb-4">All tools</h1>
<div class="flex gap-2 mb-4">
  {% for tag in ["", "pdf", "md", "html"] %}
  <button onclick="filter('{{ tag }}')" class="bg-gray-300 px-3 py-1 rounded">
    {{ tag or "all" }}
  </button>
  {% endfor %}
</div>
<div class="grid grid-cols-3 gap-4">
  {% for t in tools %}
  <a
    href="/tool/{{ t.slug }}"
    data-tags="{{ t.tags }}"
    class="card bg-white p-4 rounded shadow hover:shadow-md"
  >
    <h2 class="font-bold">{{ t.name }}</h2>
    <p class="text-sm text-gray-600">{{ t.desc }}</p>
  </a>
  {% endfor %}
</div>
<script>
  const filter = (tag) =>
    document
      .querySelectorAll(".card")
      .forEach((c) =>
        c.classList.toggle(
          "hidden",
          tag && !c.dataset.tags.split(" ").includes(tag),
        ),
      );
</script>
{% endblock %}
````

## templates/tool.html

````html
{% extends "base.html" %} {% block body %}
<div class="bg-white p-4 rounded shadow space-y-3">
  <h2 class="text-xl font-bold">{{ tool.name }}</h2>
  {% include "tools/" ~ tool.slug ~ ".html" %}
</div>
{% endblock %}
````

## templates/tools/html-to-md.html

````html
<form method=post action=/html-to-md enctype=multipart/form-data class="space-y-3">
  <input type=file name=file accept=.html required class="block w-full">
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Convert (ZIP)</button>
  <button type=reset class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
````

## templates/tools/md-to-html.html

````html
<form method=post action=/md-to-html target=_blank enctype=multipart/form-data class="space-y-3">
  <input name=title placeholder="Title" class="block w-full border rounded px-2 py-1">
  <input type=file name=files accept=.md multiple required class="block w-full">
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Convert</button>
  <button type=reset class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
````

## templates/tools/md-to-pdf.html

````html
<form method=post action=/md-to-pdf target=_blank enctype=multipart/form-data class="space-y-3">
  <input type=file name=files accept=.md multiple required class="block w-full">
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Convert</button>
  <button type=reset class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
````

## templates/tools/merge-md.html

````html
<form method=post action=/merge-md enctype=multipart/form-data class="space-y-3">
  <input type=file name=files accept=.md multiple required class="block w-full">
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Merge</button>
  <button type=reset class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
````

## templates/tools/merge.html

````html
<form id=merge method=post action=/merge target=_blank enctype=multipart/form-data class="space-y-3">
  <input id=pick type=file accept=.pdf multiple class="block w-full">
  <ul id=list class="space-y-1"></ul>
  <input id=files type=file name=files multiple hidden>
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Merge</button>
  <button type=button onclick="items=[];draw()" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
<script>
let items = [];
const li = (f, i) => `<li class="flex items-center gap-2">
  <span class="flex-1 truncate">${i + 1}. ${f.name}</span>
  <button type=button onclick="mv(${i},-1)">&uarr;</button>
  <button type=button onclick="mv(${i},1)">&darr;</button>
  <button type=button onclick="items.splice(${i},1);draw()" class="text-red-600">&times;</button></li>`;
const draw = () => list.innerHTML = items.map(li).join("");
const mv = (i, d) => {
  const j = i + d;
  if (j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  draw();
};
pick.onchange = () => { items.push(...pick.files); pick.value = ""; draw(); };
merge.onsubmit = e => {
  if (!items.length) return e.preventDefault();
  const dt = new DataTransfer();
  items.forEach(f => dt.items.add(f));
  files.files = dt.files;
};
</script>
````

## templates/tools/pdf-to-md.html

````html
<form method=post action=/markdown target=_blank enctype=multipart/form-data class="space-y-3">
  <input type=file name=file accept=.pdf required class="block w-full">
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Convert</button>
  <button type=reset class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
````

## templates/tools/split-md.html

````html
<form method=post action=/split-md enctype=multipart/form-data class="space-y-3">
  <input type=file name=file accept=.md required class="block w-full">
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Split (ZIP)</button>
  <button type=reset class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
````

## templates/tools/split.html

````html
<form method=post action=/split target=_blank enctype=multipart/form-data class="space-y-3">
  <input type=file name=file accept=.pdf required class="block w-full">
  <input name=ranges placeholder="3-5, 8-10" required class="block w-full border rounded px-2 py-1">
  <button class="bg-blue-600 text-white px-4 py-2 rounded">Split</button>
  <button type=reset class="bg-gray-300 px-4 py-2 rounded">Clear</button>
</form>
````
