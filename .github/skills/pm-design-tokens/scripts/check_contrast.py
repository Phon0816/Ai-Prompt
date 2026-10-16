#!/usr/bin/env python3
"""Kiểm tra tương phản WCAG cho file tokens.css (chỉ cần Python 3, không cài thêm gì).

Dùng:  python check_contrast.py [đường/dẫn/tokens.css]
Mặc định đọc ../assets/tokens.css. Thoát mã 1 nếu có cặp FAIL.

Ngoài ngưỡng tối thiểu (WCAG), chữ chính còn có TRẦN để giao diện không chói:
đen thuần trên trắng thuần là 21:1, ở đây giữ chữ chính trong khoảng 7–14:1.
"""
import pathlib
import re
import sys

DEFAULT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "tokens.css"

# (token chữ/đối tượng, token nền, tối thiểu, trần hoặc None, ý nghĩa)
PAIRS = [
    ("ink-1", "bg-surface", 7.0, 14.0, "chữ chính / thẻ"),
    ("ink-1", "bg-app", 7.0, 14.0, "chữ chính / nền trang"),
    ("ink-1", "bg-sunken", 7.0, 14.0, "chữ chính / vùng lõm"),
    ("ink-1", "brand-tint", 7.0, 14.0, "chữ chính / mục được chọn"),
    ("ink-2", "bg-surface", 4.5, None, "chữ phụ / thẻ"),
    ("ink-2", "bg-sunken", 4.5, None, "chữ phụ / vùng lõm"),
    ("ink-3", "bg-surface", 4.5, None, "meta / thẻ"),
    ("ink-3", "bg-app", 4.5, None, "meta / nền trang"),
    ("ink-3", "bg-sunken", 4.5, None, "meta, placeholder / vùng lõm"),
    ("on-brand", "brand", 4.5, None, "chữ nút đặc"),
    ("on-brand", "brand-hover", 4.5, None, "chữ nút đặc (hover)"),
    ("on-brand", "brand-press", 4.5, None, "chữ nút đặc (nhấn)"),
    ("brand-ink", "brand-tint", 4.5, None, "chữ trên nền brand nhạt"),
    ("brand", "bg-app", 4.5, None, "link / chữ brand trên nền"),
    ("brand", "bg-surface", 4.5, None, "link / chữ brand trên thẻ"),
    ("line-control", "bg-surface", 3.0, None, "viền ô nhập / thẻ"),
    ("line-control", "bg-app", 3.0, None, "viền ô nhập / nền trang"),
    ("safety-line", "bg-surface", 3.0, None, "vạch guardrail"),
    ("ok-ink", "ok-bg", 4.5, None, "chữ trạng thái OK"),
    ("err-ink", "err-bg", 4.5, None, "chữ trạng thái lỗi"),
    ("safety-ink", "safety-bg", 4.5, None, "chữ guardrail"),
    ("ok-ink", "bg-surface", 4.5, None, "chữ OK inline"),
    ("err-ink", "bg-surface", 4.5, None, "chữ lỗi inline"),
    ("safety-ink", "bg-surface", 4.5, None, "chữ guardrail inline"),
    ("hue-sky-ink", "hue-sky-bg", 4.5, None, "chip lĩnh vực: sky"),
    ("hue-orchid-ink", "hue-orchid-bg", 4.5, None, "chip lĩnh vực: orchid"),
    ("hue-butter-ink", "hue-butter-bg", 4.5, None, "chip lĩnh vực: butter"),
    ("hue-sand-ink", "hue-sand-bg", 4.5, None, "chip lĩnh vực: sand"),
]

HEX = re.compile(r"--([\w-]+)\s*:\s*#((?:[0-9a-fA-F]{6})|(?:[0-9a-fA-F]{3}))(?![0-9a-fA-F])")


def parse(css: str) -> dict:
    tokens = {}
    for name, h in HEX.findall(css):
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        tokens[name] = h.upper()
    return tokens


def _lin(c: int) -> float:
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(h: str) -> float:
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def ratio(a: str, b: str) -> float:
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main() -> int:
    path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    if not path.exists():
        print(f"Không thấy file: {path}")
        return 2
    tokens = parse(path.read_text(encoding="utf-8"))
    fails = 0
    print(f"Kiểm tra {path}\n")
    for fg, bg, lo, hi, note in PAIRS:
        if fg not in tokens or bg not in tokens:
            missing = fg if fg not in tokens else bg
            print(f"FAIL  thiếu token --{missing}  ({note})")
            fails += 1
            continue
        r = ratio(tokens[fg], tokens[bg])
        ok = r >= lo and (hi is None or r <= hi)
        why = "" if ok else (f"  < {lo}" if r < lo else f"  > trần {hi} (quá gắt)")
        print(f"{'PASS' if ok else 'FAIL'}  {r:5.2f}:1  --{fg} / --{bg}  ({note}){why}")
        fails += 0 if ok else 1
    print(f"\n{'ĐẠT TẤT CẢ' if not fails else f'{fails} cặp KHÔNG ĐẠT — sửa token, đừng nới ngưỡng'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
