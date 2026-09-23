import unittest

from app.tracer import safe_value, trace_code


class TracerTests(unittest.TestCase):
    def test_trace_captures_loop_state_and_output(self):
        result = trace_code(
            "total = 0\n"
            "for number in [1, 2, 3]:\n"
            "    total += number\n"
            "print(total)\n"
        )

        self.assertIsNone(result["error"])
        self.assertEqual(result["output"], "6\n")
        self.assertGreater(len(result["steps"]), 0)
        self.assertEqual(result["steps"][-1]["output"], "6\n")

    def test_trace_captures_exception(self):
        result = trace_code("value = 10\nprint(value / 0)\n")

        self.assertIsNotNone(result["error"])
        self.assertEqual(result["error"]["type"], "ZeroDivisionError")
        self.assertTrue(any(step["event"] == "exception" for step in result["steps"]))

    def test_safe_value_bounds_large_collections(self):
        value = safe_value(list(range(25)))

        self.assertEqual(len(value), 21)
        self.assertEqual(value[-1], "…")


if __name__ == "__main__":
    unittest.main()
