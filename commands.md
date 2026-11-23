# Commands

Create the virtual environment (first time only, requires Python 3.13):

```bash
py -3.13 -m venv .venv
```

Activate the virtual environment in Git Bash:

```bash
source .venv/Scripts/activate
```

Or in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
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

Stop the application with `Ctrl+C`, then deactivate the virtual environment:

```bash
deactivate
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
