#!/usr/bin/env python3
"""Build a product-background merge plan and prompt pack."""

import argparse
import json
from pathlib import Path


def build_prompt(product, background, angle, placement, lighting):
    return (
        "Create one final composite from three uploaded images: product, background, and angle reference. "
        f"Preserve the exact same product: {product}. "
        f"Use this background context unchanged: {background}. "
        f"Use the angle image only for pose/orientation and match it to: {angle}. "
        f"Place the product: {placement}. "
        f"Match lighting and scene integration: {lighting}. "
        "Keep the product silhouette, proportions, color, material, finish, logo position, "
        "label layout, seams, ports, buttons, texture, packaging, and visible details unchanged. "
        "Use the angle reference only for pose. Do not copy any colors, clothing, body parts, "
        "object design, shoe style, or background from the angle reference. Add realistic contact shadow, ambient color, edge "
        "blending, and reflections where appropriate. Do not invent readable text."
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--product", required=True, help="Locked product identity notes.")
    parser.add_argument("--background", required=True, help="Background scene notes.")
    parser.add_argument("--angle", required=True, help="Angle reference pose, angle ID, or text angle.")
    parser.add_argument("--placement", default="centered naturally on the main visible surface")
    parser.add_argument("--lighting", default="match the background light direction, shadow softness, and color temperature")
    parser.add_argument("--output", help="Optional JSON output path.")
    args = parser.parse_args()

    plan = {
        "inputs": {
            "product": args.product,
            "background": args.background,
            "angle": args.angle,
            "placement": args.placement,
            "lighting": args.lighting,
        },
        "merge_plan": {
            "product_lock": [
                "same SKU and silhouette",
                "same proportions and geometry",
                "same colors, materials, and finish",
                "same logo, label layout, seams, ports, buttons, texture, packaging, and accessories",
                "no invented readable text",
            ],
            "angle_lock": [
                "match uploaded angle reference or selected angle ID",
                "transfer only pose from angle reference",
                "never transfer angle-reference colors, clothing, legs, body parts, or product design",
                "ask for more product views if hidden geometry is exposed",
            ],
            "lighting_lock": [
                "match background light direction",
                "match shadow softness and density",
                "match color temperature and ambient bounce",
                "add contact shadow and plausible reflections",
            ],
        },
        "prompt": build_prompt(args.product, args.background, args.angle, args.placement, args.lighting),
        "negative_prompt": (
            "different product, redesign, recolor, changed logo, moved label, invented text, "
            "new parts, missing parts, copied angle-reference design, copied background object, "
            "wrong angle, floating product, impossible shadow, halo, distorted proportions"
        ),
    }

    data = json.dumps(plan, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(data, encoding="utf-8")
    else:
        print(data)


if __name__ == "__main__":
    main()
