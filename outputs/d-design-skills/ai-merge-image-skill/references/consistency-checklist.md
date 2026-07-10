# Consistency Checklist

Use this checklist after each output.

## Product Identity

- Same silhouette and proportions as the uploaded product.
- Same color, material, finish, texture, transparency, and reflectivity.
- For shoes: same toe shape, heel height, heel block shape, strap path, buckle shape, sole edge, lining color, stitching, upper texture, and pair relationship.
- Same logo position, size, orientation, and spacing.
- Same label layout; no invented readable text.
- Same buttons, ports, seams, stitching, closures, caps, handles, holes, feet, accessories, and packaging details.
- No background prop, angle reference object, or generic product detail has leaked onto the product.
- No angle-reference colors, legs, clothing, socks, body parts, or simplified graphic style leaked into the product.

## Angle Fidelity

- Product yaw matches the requested or uploaded angle.
- Product pitch matches the requested or uploaded angle.
- Product roll is intentional and matches the scene.
- Shoe toe direction, heel placement, walking/standing relationship, and pair spacing match the angle reference when one is uploaded.
- Hidden faces are not hallucinated beyond available references.
- Label or front design remains readable when the chosen angle should preserve it.

## Background Integration

- Background content and layout remain unchanged unless requested.
- Product scale fits nearby scene cues.
- Product base touches the correct surface and does not float.
- Contact shadow exists and follows background light direction.
- Shadow softness, density, and color match the scene.
- Highlights, rim light, reflections, and ambient color match the background.
- Product edges are clean without halo, jagged cutout, double outline, or blur mismatch.
- Depth of field and sharpness match the scene.

## Reject Conditions

Reject and revise if:

- The product becomes a different SKU.
- The angle conflicts with the uploaded angle reference.
- The output copies the angle image's yellow shoe color, blue legs, red clothing, black background, or graphic style.
- Any logo, label, pattern, material, or component changes.
- The result invents readable text.
- The product floats, casts the wrong shadow, or has impossible lighting.
- The background is unnecessarily redesigned.
