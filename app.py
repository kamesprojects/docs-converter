import io
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


DOWNLOAD_NAMES = {
    "merge": "merged.pdf",
    "split": "split.pdf",
    "markdown": "document.md",
    "md_to_html": "documents.html",
    "md_to_pdf": "documents.pdf",
}


@app.after_request
def download(response):
    """Save the result as a file when the form was sent with the Download button."""
    name = DOWNLOAD_NAMES.get(request.endpoint)
    if name and response.status_code == 200 and "download" in request.form:
        response.headers.set("Content-Disposition", "attachment", filename=name)
    return response


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
