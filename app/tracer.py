import io
import json
import sys
import traceback
from contextlib import redirect_stdout

MAX_STEPS = 1000
MAX_DEPTH = 3
MAX_ITEMS = 20
MAX_TEXT = 500

class TraceLimitExceeded(Exception):
    pass

def safe_value(value, depth=0):
    if depth > MAX_DEPTH:
        return "<max depth>"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value if len(value) <= MAX_TEXT else value[:MAX_TEXT] + "…"
    if isinstance(value, (list, tuple)):
        items = [safe_value(v, depth + 1) for v in list(value)[:MAX_ITEMS]]
        if len(value) > MAX_ITEMS:
            items.append("…")
        return items
    if isinstance(value, dict):
        result = {}
        for key, val in list(value.items())[:MAX_ITEMS]:
            result[str(key)] = safe_value(val, depth + 1)
        if len(value) > MAX_ITEMS:
            result["…"] = "more items"
        return result
    if isinstance(value, set):
        return [safe_value(v, depth + 1) for v in list(value)[:MAX_ITEMS]]
    return repr(value)[:MAX_TEXT]

def stack_snapshot(frame):
    stack = []
    current = frame
    while current is not None:
        stack.append({"name": current.f_code.co_name, "line": current.f_lineno, "file": current.f_code.co_filename})
        current = current.f_back
    return list(reversed(stack))

def trace_code(code):
    steps = []
    output = io.StringIO()
    counter = {"value": 0}

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<codelens>":
            return tracer
        if event == "line":
            counter["value"] += 1
            if counter["value"] > MAX_STEPS:
                raise TraceLimitExceeded(f"Execution stopped after {MAX_STEPS} steps.")
            steps.append({
                "step": counter["value"],
                "line": frame.f_lineno,
                "event": "line",
                "locals": {k: safe_value(v) for k, v in frame.f_locals.items() if not k.startswith("__")},
                "stack": stack_snapshot(frame),
                "output": output.getvalue(),
            })
        elif event == "exception":
            exc_type, exc_value, _ = arg
            steps.append({
                "step": counter["value"],
                "line": frame.f_lineno,
                "event": "exception",
                "locals": {k: safe_value(v) for k, v in frame.f_locals.items() if not k.startswith("__")},
                "stack": stack_snapshot(frame),
                "output": output.getvalue(),
                "error": {"type": exc_type.__name__, "message": str(exc_value)},
            })
        return tracer

    namespace = {"__name__": "__main__"}
    error = None
    sys.settrace(tracer)
    try:
        with redirect_stdout(output):
            exec(compile(code, "<codelens>", "exec"), namespace, namespace)
    except TraceLimitExceeded as exc:
        error = {"type": "TraceLimitExceeded", "message": str(exc)}
    except Exception as exc:
        error = {"type": type(exc).__name__, "message": str(exc), "traceback": traceback.format_exc(limit=8)}
    finally:
        sys.settrace(None)

    final_output = output.getvalue()
    if steps:
        steps[-1]["output"] = final_output
    return {"steps": steps, "output": final_output, "error": error}

def main():
    print(json.dumps(trace_code(sys.stdin.read()), ensure_ascii=False))

if __name__ == "__main__":
    main()
