import json
import subprocess
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
app = FastAPI(title="CodeLens", version="0.1.0")

class RunRequest(BaseModel):
    code: str

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CodeLens"}

@app.post("/api/run")
def run_code(request: RunRequest):
    try:
        completed = subprocess.run(
            [sys.executable, "-m", "app.tracer"],
            input=request.code, text=True, capture_output=True,
            cwd=BASE_DIR, timeout=6,
        )
    except subprocess.TimeoutExpired:
        return {"steps": [], "output": "", "error": {"type": "Timeout", "message": "Execution exceeded 6 seconds."}}

    if completed.returncode != 0 and not completed.stdout.strip():
        return {"steps": [], "output": completed.stdout,
                "error": {"type": "RunnerError", "message": completed.stderr[-2000:]}}

    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError:
        return {"steps": [], "output": completed.stdout,
                "error": {"type": "RunnerError", "message": "The execution runner returned invalid data."}}

@app.get("/")
def index():
    return FileResponse(BASE_DIR / "static" / "index.html")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
