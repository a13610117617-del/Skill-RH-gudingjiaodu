# Angle Library

Use this library when the user chooses an angle by name or needs a menu of options. If the user uploads an angle reference image, the uploaded image overrides this library.

## Fixed Angle Library

| Angle ID | User-facing name | Camera / product pose | Best for |
| --- | --- | --- | --- |
| angle-01 | Handheld plus worn shoe top-down | One foot enters from the right wearing a shoe; one hand supports a second display shoe below it. Both shoes angle toward the upper-left in a close oblique top-down composition. | Hand-supported product display plus worn-shoe relationship |
| angle-02 | Paired display shoes top-down | A pair of display shoes only, no body, hands, legs, or clothing. Two shoes sit diagonally on the scene, toes toward the lower-right, with a clean high oblique product-display view. | Pure product pair display without model limbs |
| angle-03 | Single-foot side try-on | One visible foot wearing one shoe, leg entering from above, shoe shown in side profile with toe to the right and heel to the left. No second foot, hand, or display shoe. | Single worn shoe side-view try-on closeup |

## Angle Selection Rules

- Use `angle-01` when the final image needs both a worn shoe and a hand-supported display shoe in the same frame.
- Use `angle-02` when the final image should show only a clean pair of product shoes without model limbs.
- Use `angle-03` when the final image should show exactly one worn shoe on one visible foot.
- The selected angle image itself is the primary pose and composition control. The selected pose prompt only clarifies the image and must not override visible placement, shoe count, limb count, or camera perspective.

## Matching Uploaded Angle References

When the user uploads an angle reference:

1. Identify yaw: front, left, right, back, or three-quarter.
2. Identify pitch: eye-level, high/top, low/upward, or overhead.
3. Identify roll: level, slight clockwise, slight counter-clockwise.
4. Identify lens feel: normal, telephoto/compressed, wide-angle/expanded.
5. Transfer only camera pose and product orientation to the uploaded product.
6. Do not transfer the angle reference object's color, material, logo, label, proportions, or extra features.

## Ambiguity Handling

- If the requested angle exposes invisible product details, ask for another product photo from that side.
- If the background perspective cannot support the requested angle, prioritize a physically plausible angle and explain the adjustment.
- If the user asks for "same as reference angle", match the reference image pose more strongly than any text label.
