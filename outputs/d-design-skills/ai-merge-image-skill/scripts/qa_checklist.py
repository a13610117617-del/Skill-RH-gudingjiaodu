#!/usr/bin/env python3
"""Print a compact QA checklist for product-background merge outputs."""

CHECKS = [
    "Product is the same SKU: silhouette, proportions, color, material, finish.",
    "Logo position, label layout, seams, ports, buttons, and texture are unchanged.",
    "No invented readable text or copied details from the angle/background reference.",
    "Angle yaw, pitch, and roll match the uploaded reference or selected angle ID.",
    "Background scene content remains unchanged unless requested.",
    "Scale and perspective fit the background surface and camera height.",
    "Contact shadow exists, product does not float, and shadow direction is correct.",
    "Shadow softness, highlight color, reflections, and edge blending match the scene.",
    "No halos, jagged masks, blur mismatch, warped labels, or distorted geometry.",
]


def main():
    for index, check in enumerate(CHECKS, 1):
        print(f"{index}. {check}")


if __name__ == "__main__":
    main()
