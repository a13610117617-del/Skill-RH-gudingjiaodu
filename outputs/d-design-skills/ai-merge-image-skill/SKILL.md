---
name: ai-merge-image-skill
description: One-click three-image product scene fusion: merge a user-uploaded product shoe image, a user-uploaded background image, and a user-uploaded angle/pose reference image into one natural composite. Use when Codex needs shoe/product-background compositing, angle-controlled product fusion, ecommerce scene images, lifestyle shoe renders, background replacement, product placement, or foolproof image merge workflows where the generated product must stay identical to the uploaded product while borrowing only pose/angle from the angle reference and only environment/lighting from the background.
---

# AI Merge Image Skill

## Purpose

Use this skill to help a user perform a one-click three-image merge: product shoe image + background image + angle reference image. Treat product identity and angle fidelity as the primary success criteria. The output should look like the exact same uploaded shoe was photographed naturally inside the target background while using the pose/angle shown by the angle reference.

Set the acceptance target as 100% product match to the user's uploaded product and 100% angle match to the user's uploaded or selected angle. Do not rely on a loose text-only interpretation of "similar"; enforce a reference-anchored editing workflow: preserve the product pixels and visible features wherever possible, generate only the surrounding integration changes, compare the result against the reference product, and revise or ask for more references when a hidden side or exact angle cannot be inferred.

When multiple reference images are uploaded, classify each image before generation:

1. Product image: the subject that must be preserved with high fidelity in the final image. This has the highest priority.
2. Background image: the environment and spatial setting for the final image.
3. Model image: only reference clothing, limb pose, body proportion, and overall styling.
4. Color-block image or sketch: only reference composition, angle, subject placement, and region relationships. Do not reference its colors, materials, or concrete objects.

Generation priority is: product fidelity > composition/angle > background consistency > clothing and limb reference > artistic interpretation.

If references conflict, product image and composition/angle image win. Colors in color-block templates only represent region meanings and must never become final-image colors. Product shoe image is the shoe body and must remain faithful; background image is the background; model reference image only controls clothing and limbs; uploaded angle references and angle-library references only control angle and region placement, not color.

Angle reference images and angle-library images are semantic region masks, not style images. First identify the image regions, then replace those regions with the proper source content:

- Yellow regions = shoe regions. Generate the uploaded product shoe in every yellow region.
- Blue regions = leg regions. Generate realistic natural female legs in every blue region.
- Red regions = clothing regions. Generate clothing from the model reference in red regions.
- Black regions = background regions. Generate the indoor background from the background reference in every black region.

Never use the yellow/blue/red/black mask colors as final colors. Do not make yellow shoes, blue legs, red block clothing, or a black mask background. Do not copy shoes from the model reference image. The final output should be a realistic natural female shoe-on-foot scene with the uploaded product shoe worn on the feet, the angle and perspective guided by the semantic mask, the background from the background image, and clothing from the model image.

Forbidden: text, watermark, extra logos, extra shoes, extra legs, deformed feet, wrong toes, retained color blocks from the angle reference, black mask background, and shoes copied from the model reference.

Chinese hard prompt for the local one-click generator:

请严格按照以下多图参考逻辑生成图片：
重要：角度参考图和角度库里的图是语义分区遮罩图，不是风格图。请先根据角度参考图和角度库里的图识别画面区域，再用产品鞋图、背景图、模特参考图分别替换对应区域。

产品鞋图是产品图，必须作为最终画面中鞋子的唯一参考。最终生成的鞋子必须完全参考图，包括鞋型、颜色、材质、纹理、鞋带、鞋扣、鞋跟、鞋底和整体比例。

背景图必须作为最终画面的真实背景。最终画面中的地面、墙面、踢脚线、空间感、光线氛围都参考背景图。

模特参考图是模特服装和身体姿态参考图，只参考模特的衣服风格、裙子材质、腿部姿态和整体优雅感觉。不要参考模特参考图中的鞋子，不要生成模特参考图里的凉鞋。

角度参考图和角度库里的图是区域语义图，也是构图和角度参考图。角度参考图和角度库里的图不是最终画面的颜色参考，不是材质参考，也不是风格参考。角度参考图和角度库里的图只用于说明画面中每个区域应该生成什么内容：

- 黄色区域 = 鞋子区域。请在所有黄色区域生成产品鞋图中的同款鞋子。
- 蓝色区域 = 腿部区域。请在所有蓝色区域生成真实自然的女性腿部。
- 红色区域 = 衣服区域。请在红色区域生成模特参考图的穿搭。
- 黑色区域 = 背景区域。请在所有黑色区域生成背景图中的室内背景。

最终画面要求：
生成一张真实自然的女鞋上脚场景图。画面中的女性模特穿着产品鞋图的鞋子，腿部和鞋子的角度、位置、大小关系、透视关系严格参考角度库里的参考图或者角度参考图。背景使用背景图。衣服参考模特图。

特别注意：
角度参考图和角度库里的图中的黄色、蓝色、红色、黑色只是区域标记颜色，最终画面中不能出现这些纯色块。不要把黄色生成黄色鞋子，而是要在黄色区域生成产品鞋图的鞋。不要把蓝色生成蓝色腿，而是要在蓝色区域生成真实肤色腿部。不要把红色生成红色衣服，而是要在红色区域生成模特图的穿搭。不要把黑色保留为黑色背景，而是要在黑色区域生成背景图的背景。

鞋子保真要求：鞋子必须严格接近参考鞋图。
构图要求：保持角度参考图和角度库里的镜头角度。鞋子要正确穿在脚上，符合人体结构和透视。
光影要求：整体是真实摄影效果，柔和室内光线，鞋子和腿部与地面之间有自然接触阴影。所有元素必须像同一张照片中拍摄出来的，不要像拼贴。
禁止内容：不要文字、不要水印、不要 logo、不要多余的鞋、不要多余的腿、不要畸形脚、不要错误脚趾、不要保留角度参考图和角度库里的色块、不要使用黑色背景、不要生成模特图里的鞋。

## Required Three Inputs

1. Product image: the exact shoe/product to preserve. This image is the only source for product design, color, material, texture, silhouette, buckle, strap, heel, sole, stitching, logo, label, and all visible details.
2. Background image: the target scene or environment. This image is the only source for wall, floor, props, lighting, shadows, color temperature, scale cues, and camera perspective.
3. Angle image: the product pose/footwear angle reference. This can come from either a user-uploaded angle reference image or a selected thumbnail in the angle library. Angle-library images may be semantic color-block templates: yellow means the shoe area and shoe angle, blue means legs, red means clothing, and black means background/empty environment. This image is the only source for shoe orientation, camera angle, yaw, pitch, roll, foot pose, placement relationship, wearing angle, region layout, and occlusion relationship. The final image must follow this angle source 100%. It must not control shoe design, final colors, model styling, or background texture.
4. Optional model image: the model styling and leg reference. It controls only outfit styling, leg appearance, skin tone, lower-body proportions, leg texture, and wearing mood. When an angle-library color-block image is selected, map the model image's legs into the blue areas and outfit into the red areas. It must not control shoe angle, camera angle, product design, background, or scene layout.

## UI Interaction Contract

When this skill is exposed in the local Skill Runner, keep the flow one-click and visual:

1. Show upload slots for product image, background image, angle reference image, and an optional model reference image.
2. Every uploaded image must immediately show a thumbnail preview in its slot so the user can verify the selected file before generation.
3. Replace the generic submit action with `一键生图` for this skill. Clicking `一键生图` must directly run the merge generation flow; do not require the user to click a separate `发送给技能` step first.
4. After the user uploads the required images and enters any demand text, go straight to image generation. Do not run an intermediate requirement-analysis, reference-confirmation, direction-planning, or prompt-confirmation step for this skill.
5. The one-click generation path must bypass the Skills Expert reasoning layer and call the backend GPT image-generation API directly with the uploaded product, background, and angle reference images.
6. Provide an angle library with thumbnail cards. The user can either select one angle-library thumbnail or upload their own angle reference image. A user-uploaded angle reference overrides the library selection; choosing a library thumbnail clears the uploaded angle slot.
7. The selected angle-library thumbnail or uploaded angle reference must be sent to the image-generation backend as the angle reference. The generated image must follow that selected angle, pose, orientation, and camera relationship at 100% priority.
   For GPT image generation, send the angle reference before the product/background/model references and repeat it once so the model sees the angle template as the highest-priority reference. Product references must not override the selected angle.
8. Generate directly from the uploaded references using the backend GPT image-generation API. Do not require ComfyUI, ControlNet, or a separate local precise-control service for this one-click flow.
9. Angle-library thumbnails are semantic structure references. Yellow areas are where the uploaded product shoe must appear and define the shoe angle; blue areas define leg position and pose; red areas define clothing position and outline; black areas define background/empty scene space. Never render the yellow/blue/red/black blocks as final colors.
10. If a model reference image is uploaded, send it to the backend as a model reference and use it only for outfit, legs, skin tone, lower-body proportions, leg texture, and wearing mood. Place those model-derived legs and clothing according to the angle image's blue and red areas. Do not use the model image as an angle source.
11. Do not navigate away from the current one-click generation area during generation. Show an inline result panel below the `一键生图` controls with a centered spinning circle while generating and replace it with a generated-image preview when complete.
12. Place a `暂停生成` button next to `一键生图`; clicking it must abort the current generation request.

Optional inputs:

- Placement preference: center, left, right, foreground, on feet, on floor, on shelf, on table.
- Output format: single image, comparison before/after, transparent product cutout plus merged scene, or multiple angle variants.
- Marketplace or channel: Amazon, Taobao, Tmall, JD, Xiaohongshu, Shopify, poster, banner.

## Core Workflow

1. Confirm the three image roles. If the UI or filenames identify `merge-product`, `merge-background`, and `merge-angle`, use those roles. If roles are unclear, ask the user to label them before generating.
2. Inspect the product shoe image first. Record the locked product identity: silhouette, toe shape, heel height/block shape, strap path, buckle, sole color, upper texture, inner lining, stitching, material shine, visible numbers/text, and all distinctive marks.
3. Inspect the background image. Record wall/floor split, horizon/baseboard line, light direction, shadow softness, color temperature, camera height, surface plane, scale cues, and where the shoe should stand.
4. Inspect the angle image. If it is a color-block angle-library image, read it as a semantic layout: yellow = shoe area and shoe angle, blue = leg area and leg pose, red = clothing area and clothing outline, black = background/empty environment. Extract left/right shoe orientation, foot angle, walking/standing relationship, visible side, heel lift, toe direction, pitch, roll, approximate placement, and occlusion from this layout. Do not treat the color blocks as final colors or style.
5. Build a merge plan: product lock, background lock, angle lock, placement box, scale, contact points, occlusion, shadow direction, reflection/highlight behavior, and forbidden changes.
6. Generate the final composite using the product image as hard product reference, the background image as hard scene reference, and the angle image as structure/pose reference. The uploaded product shoe must fill the yellow shoe area. If a model image exists, its legs and outfit must fill the blue and red areas. The output should be a single finished image, not a triptych or explanation.
7. Run a visual QA pass. Reject any result where the shoe design changed, the product borrowed the yellow/blue/red colors from the angle image, the background changed unnecessarily, the pose does not match the angle reference, or the shoe floats without correct contact shadows.
8. Revise locally. Keep the best composite and correct only product mismatch, pose mismatch, scale, shadow, reflection, color cast, edge blending, or occlusion.

## Hard Constraints

- Preserve the uploaded product's visible identity exactly: silhouette, proportions, geometry, material, color, finish, logo position, label layout, seams, ports, buttons, texture, packaging, and accessories.
- Match the uploaded angle image. Use text angles or the angle library only when the user did not provide an angle image.
- Treat visible product mismatch and angle mismatch as failed outputs, not as acceptable creative variation.
- Do not borrow design details from the background image or angle reference object. For color-block angle-library images, yellow is only the shoe placement/angle mask, blue is only the leg placement mask, red is only the clothing placement mask, and black is only the background mask. Do not copy these colors into the final image.
- Do not hallucinate readable brand text, labels, certifications, serial numbers, safety marks, ingredient text, or claims. If text is unclear, preserve it as unclear or ask for a close-up.
- Do not infer hidden sides aggressively. If the target angle exposes a side absent from the product photo, ask for another product image or produce a conservative draft clearly marked as inferred.
- Do not change background architecture, props, people, windows, shelves, table shape, or scene layout unless the user asks.
- Keep lighting physically coherent: shadow direction, softness, ambient color, rim highlights, contact darkening, and reflections must follow the background.

## Reference Files

Load only what is needed:

- `references/angle-library.md`: choose or translate shoe/product angles when no uploaded angle reference is available.
- `references/fusion-workflow.md`: follow the three-image foolproof merge procedure, masking rules, lighting match, and revision patterns.
- `references/consistency-checklist.md`: QA the merged output against product, background, and angle references.
- `references/prompt-patterns.md`: build prompts for generation, editing, relighting, and revision.

## Scripts

- `scripts/build_merge_plan.py`: create a JSON merge plan and prompt pack from product/background/angle notes.
- `scripts/qa_checklist.py`: print a compact QA checklist for product identity, angle fidelity, and lighting integration.

Use scripts when the task needs repeatable planning, multiple angle variants, or a structured handoff to an image generation tool.

## Output Standard

Return a concise deliverable summary:

- Product reference used.
- Background reference used.
- Angle source: uploaded reference, text angle, or angle library option.
- Merge assumptions: placement, scale, light direction, shadow type, and reflection handling.
- Consistency risks: missing product sides, unreadable labels, difficult transparency, reflective materials, or severe perspective mismatch.
- Files created, if any.
