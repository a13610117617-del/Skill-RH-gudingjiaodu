# Prompt Patterns

Use these patterns as starting points and replace bracketed fields.

## Full Merge Prompt

Create one final composite from three uploaded images. Image 1 is the product shoe reference and is the only source for shoe design. Image 2 is the background scene and is the only source for environment and lighting. Image 3 is the angle reference and is pose-only. Preserve the exact same product from the product reference: [product lock]. Match the shoe pose/angle to [angle source]. Place it [placement]. Keep the background scene unchanged. Match the background lighting: [light direction], [shadow softness], [color temperature], [surface contact], [reflection behavior]. Add realistic contact shadow and edge blending. Do not redesign, recolor, rebrand, relabel, simplify, add features, remove features, or copy colors/clothing/legs/shoe style from the angle reference.

## Uploaded Angle Reference Prompt

Use the angle reference only for camera pose and orientation. Apply that angle to the uploaded product while preserving the uploaded product's exact shape, proportions, material, color, logo placement, labels, seams, and visible details. Do not copy the angle reference object's design, colors, labels, parts, texture, or proportions.

## Shoe Three-Image Prompt

Use the uploaded product shoe image as the hard product identity reference. The generated shoes must be the same cream metallic Mary Jane pair with the same square toe, block heel, strap, gold buckle, upper texture, tan lining, brown sole edge, stitching, and pair relationship. Use the uploaded background image as the hard scene reference: keep the plain wall, baseboard, beige floor, camera perspective, and soft indoor light unchanged. Use the uploaded angle image only as a pose reference for the shoes: match the walking/standing angle, toe direction, heel position, yaw, pitch, and pair spacing. Do not copy the red skirt, blue legs, yellow shoe color, black background, or simplified graphic style. Output one realistic fused scene where the exact product shoes appear naturally on the floor with matching light, shadows, contact, scale, and perspective.

## Product-Preserving Edit Prompt

Keep the product identity unchanged. Only adjust perspective, scene lighting, contact shadow, reflection, ambient color, and edge integration so the product looks naturally photographed in the background. Preserve all product logos, labels, visible text layout, material, color, geometry, and component positions.

## Conservative Missing-Side Prompt

The requested angle exposes a side that is not visible in the provided product photo. Create only a conservative inferred side consistent with the visible product geometry and material. Do not invent logos, labels, ports, buttons, seams, or decorations. If exact accuracy is required, request an additional reference photo instead.

## Negative Prompt

different product, redesigned product, changed shoe color, yellow shoes, blue legs, red skirt, copied angle reference style, copied angle reference shoe design, changed buckle, changed strap, changed heel, changed toe shape, changed material, moved logo, altered label, invented readable text, missing seam, copied background object, wrong angle, floating product, impossible shadow, harsh cutout edge, halo, distorted label, warped proportions, extra accessories, background changed
