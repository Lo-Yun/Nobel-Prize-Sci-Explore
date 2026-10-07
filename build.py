"""產生網站：python build.py

輸出到 _site/ 資料夾，可以直接上傳到任何靜態網站主機（例如 GitHub Pages）。
"""
import sys

from nobel_site.build import build

if __name__ == "__main__":
    problems = build()
    sys.exit(1 if "--strict" in sys.argv and problems else 0)
