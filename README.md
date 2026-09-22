# CodeLens

> See what your code actually does.

CodeLens is a beginner-friendly Python execution visualizer. Instead of only explaining what code means, it lets you watch a program execute one step at a time.

## The idea

Beginners often understand individual lines but lose track of changing runtime state: when variables change, how loops repeat, which function is active, what is on the call stack, and what happens before an error.

CodeLens makes those invisible runtime changes visible.

Write -> Run -> Trace -> Inspect -> Understand

## How it works

1. You write Python in the source panel.
2. The browser sends it to the FastAPI backend.
3. FastAPI starts a separate local Python process.
4. app/tracer.py uses Python sys.settrace() to observe execution.
5. Each line event becomes a snapshot containing the line number, local variables, call stack and output.
6. The browser renders those snapshots as an interactive timeline.

## Architecture

Browser -> FastAPI -> separate Python process -> sys.settrace() -> JSON trace -> CodeLens timeline

## Project structure

app/main.py - FastAPI server and /api/run endpoint.
app/tracer.py - execution tracing engine.
static/index.html - application structure.
static/style.css - CodeLens visual design.
static/app.js - timeline, controls and state rendering.
requirements.txt - Python dependencies.

## Runtime trace

A captured step looks conceptually like this:

step: 4
line: 5
locals: n=4, total=6
stack: <module> at line 5
output: current stdout

The tracer walks frame.f_back to reconstruct the current call stack.

Because Python objects are not all JSON serializable, tracer.py contains a bounded safe_value() conversion for common values such as numbers, strings, lists, tuples, dictionaries and sets.

## API

GET /api/health - health check.
POST /api/run - execute submitted Python and return its trace.
GET / - serve the CodeLens UI.

Example request:

{ code: 'x = 10\nprint(x)' }

## Controls

RUN CODE - execute and trace.
PREV - previous runtime step.
NEXT - next runtime step.
RESET - clear the trace.
Timeline dots - jump directly to a captured step.
Ctrl + Enter - run quickly.

## Running locally

Requirements: Python 3.10+, pip and a modern browser.

Windows:

python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

Then open http://127.0.0.1:8000

macOS/Linux:

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

## Try this

numbers = [3, 5, 7]
total = 0

for number in numbers:
    total += number

print(total)

Run it and move through the timeline. You will see number and total change as the loop executes.

Try a function too:

def square(x):
    result = x * x
    return result

answer = square(6)
print(answer)

## Errors and limits

CodeLens records exceptions and shows their type and message.

The MVP limits a trace to 1000 steps and each execution request to 6 seconds. These are development safeguards, not a security sandbox.

## Security warning

CodeLens currently runs Python locally. Python can access the operating system, files and network. Do not deploy this MVP as a public multi-user code execution service.

A production runner would need real isolation, filesystem and network restrictions, CPU and memory limits, process controls and stronger sandboxing.

## Why there is no LLM in the execution engine

An LLM can explain code, but it should not be treated as runtime truth.

CodeLens separates the jobs:

Python runtime -> deterministic trace -> visualizer
                              -> future AI explainer

A future AI layer can receive the actual trace and answer questions such as why a variable changed, what happened between two steps, or why a function was called.

That means the AI explains captured execution data instead of pretending to execute the program.

## Design

CodeLens intentionally avoids a generic AI SaaS appearance. It uses a technical workbench style: cool grey workspace, warm off-white editor, amber execution marker, cyan runtime status, thin borders, engineering grid, Space Grotesk and IBM Plex Mono.

## Roadmap

Phase 1 - Python tracing, variables, call stack, stdout, errors, timeline and local subprocess. Completed.
Phase 2 - breakpoints, pause/resume, variable-change highlighting, watch expressions, memory/reference visualization and syntax highlighting.
Phase 3 - array/dictionary views, loop visualization, recursion tree, algorithm timeline and complexity hints.
Phase 4 - optional LLM integration, trace-aware explanations and debugging hints.
Phase 5 - JavaScript, Java and C++ tracing adapters.

## Design principle

Don't just read the code. Watch the state change.

The goal is not to replace programming practice with AI. It is to make program execution visible enough for learners to build the mental model themselves.

## Tech stack

Frontend: HTML, CSS, Vanilla JavaScript
Backend: Python, FastAPI
Tracing: Python sys.settrace()
Runtime: Python subprocess
API: JSON over HTTP
Typography: Space Grotesk + IBM Plex Mono

## License

MIT License.