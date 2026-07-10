# Fusion Workflow

Use this reference for foolproof three-image product-background merging.

## Three Image Roles

- Product image: lock the shoe/product identity. Copy only this image's design, material, color, texture, buckle, straps, sole, heel, logo, label, seams, and visible details.
- Background image: lock the scene. Copy only this image's room, wall, floor, props, horizon, lighting, shadow softness, and camera perspective.
- Angle image: lock pose only. Copy only shoe orientation, foot pose, walking/standing relationship, yaw, pitch, roll, toe direction, heel lift, and placement rhythm.

Never copy the angle image's colors, clothing, legs, body, shoe design, background, or graphic style.

## Planning Pass

Create a short merge plan before writing an image prompt:

- Product lock: list exact shoe/product features that cannot change.
- Background read: light direction, color temperature, contrast, horizon/baseboard, surface, and scale cues.
- Angle target: uploaded angle image pose, or angle library ID when no angle image exists.
- Placement: target region, surface contact, crop margins, and product size relative to scene objects.
- Integration needs: shadow, reflection, rim light, ambient occlusion, edge matte, foreground occlusion.
- Risk flags: glass, chrome, transparency, fur/fabric, unreadable text, missing product side, complex packaging.

## Editing Priority

Prefer this order:

1. Product-preserving composite: isolate product, transform/perspective-correct conservatively, place into background, generate only shadows, reflections, and edge blending.
2. Three-image reference generation: provide product, background, and angle reference together; explicitly assign roles and enforce that angle image is pose-only.
3. Masked image edit: mask around product/contact area; keep the product unchanged except for lighting and angle alignment.
4. Text-only generation: use only when no image editing tool is available, and warn that product fidelity is lower.

## Lighting Match

- Match key light direction from the background. If shadows fall down-right in the scene, the product shadow must fall down-right.
- Match shadow softness. Window light and overcast scenes need broad soft shadows; direct sunlight needs crisp shadows.
- Match color temperature. Warm interiors need warm highlights and warm bounce; outdoor shade often needs cool ambient.
- Add contact shadow where the product touches the surface. The product should not float.
- Add rim highlights only if the background contains a plausible bright edge source.
- For glossy products, add subtle environment reflections from the background colors, not new patterns or fake logos.

## Perspective And Scale

- Align the product base to the surface plane.
- Match camera height. Low-background views need a low product view; overhead backgrounds need a top or flat lay angle.
- Keep product verticals plausible. Avoid warped labels or distorted logos unless the real product surface curves.
- Use nearby objects as scale cues, but do not resize the product so small that identity details are lost.
- Preserve natural margins unless the user asks for a crop.

## Shoe-Specific Rules

- Preserve toe shape, square/round/pointed form, heel height, heel geometry, strap width/path, buckle shape, sole color, inner lining, upper texture, and stitching.
- If the angle image shows shoes worn on feet, use it only to infer shoe placement and contact. Do not generate colored legs, socks, skirt, or body unless the user explicitly asks for a worn-on-model output.
- If the background is an empty wall/floor scene, place the shoes naturally on the floor plane with correct scale and contact shadows.
- If the product image shows a pair, preserve the pair relationship unless the user asks for a single shoe.

## Revision Patterns

Use localized revision prompts:

- "Keep the product shape, label, color, logo position, and material unchanged. Only soften the contact shadow to match the background."
- "Keep the current composition. Rotate the product pose closer to front-right-45 without adding or removing product features."
- "Keep the background unchanged. Remove the pasted-edge halo and match the product edge color to the ambient scene light."
- "Keep the product unchanged. Add a subtle reflection on the table following the existing light direction."
