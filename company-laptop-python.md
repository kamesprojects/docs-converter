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
