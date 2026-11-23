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
