# D.Design Public Skills Audit

Source: https://d.design/ checked 2026-06-16. Public skill list endpoint returned 108 skills.

## Key Interfaces

- Public skill list: `GET https://d.design/api/agent/v1/skills/list?scope=PUBLIC&pageNo=1&pageSize=100`
- Skill detail / prompt: `GET https://d.design/api/agent/v1/skills/{publicId}`
- Agent SDK base in page: `https://g.alicdn.com/IndustryAI/adic-next/0.1.85/sdk/latest/`
- Agent SDK default API base: `/api/agent/v1`

## Public Skills

| # | publicId | name | displayName | category | prompt chars | refs | description |
|---:|---|---|---|---|---:|---:|---|
| 1 | `ULSnRCRoLL` | `ip-design` | IP设计专家 |  | 13064 | 19 | 帮助设计师快速完成品牌 IP、潮玩 IP、文旅/城市 IP、已有 IP 应用延展的全链路设计。 |
| 2 | `6EXlLwb8X2` | `ui-spec-generator` | 页面名称特征_文档生成专家 | 设计分析 | 5532 | 2 | 接收用户上传的至少3张同一页面类型的 App/Web 整页截图（如来自不同平台的首页、PDP、购物车、订单列表等），结合用户提供的页面标准中文名与所属场域，通过多图交叉对比分析，生成两份独立 Markdown 文档：①详细识别特征文档（模块一~六，供主 Skill Stage 2-B 深度验证消费）②精简粘贴内容文档（枚举卡片，粘贴到枚举手册）。触发关键词： |
| 3 | `AKiCWQuLaY` | `page-recognition` | 打标专家_页面维度 | 设计打标 | 13888 | 15 | 高级 UI/UX 页面分析专家。对单张或批量 UI 页面截图进行深度综合打标，输出页面名称（含场域）、容器内容名称、基础状态、附加功能、阶段状态、页面布局六大维度标签 + 离散置信度 + 双格式审计报告（JSON + HTML）。基于两阶段思维链（A 变体· Stage 2-A 索引粗筛 + Stage 2-B 深度文档强同步复核）消费枚举手册与 Skill |
| 4 | `wDefj9qO8d` | `html-builder-v3` | 小应用生成器v3 |  | 15957 | 8 | 当用户要生成html应用，以及画布插件时，使用这个技能。 |
| 5 | `rq8RIPFUnD` | `alibaba-party-brand-guide` | 阿里巴巴集团党委品牌规范 | 品牌设计 | 5576 | 3 | 当用户需要参考阿里巴巴集团党委的品牌规范进行设计时使用此技能。包含品牌色彩、字体、IP 形象（红豆）、排版、标识使用规则、视觉风格、IP 海报、周边物料等完整规范，适用于所有与阿里巴巴集团党委品牌相关的设计物料制作。触发关键词：党委品牌、红豆 IP、党建设计、品牌规范、党委物料、IP 海报、周边设计。不触发场景：与阿里巴巴集团党委无关的通用设计需求。 |
| 6 | `hwM68xjlyj` | `amazon-product-image-set` | 亚马逊套图设计专家 | 电商设计 | 2112 | 1 | 面向亚马逊跨境电商卖家和设计师，提供从策略分析到逐张图片执行的完整套图设计服务。当用户提到「亚马逊套图」「亚马逊图片」「listing 图片」「主图/细节图/场景图/A+ 图」「跨境电商产品图」「亚马逊图片合规」「套图文案」「套图 checklist」「亚马逊产品图设计」等关键词时触发。触发边界：仅限亚马逊平台套图设计场景；Shopify 独立站、Lazad |
| 7 | `8v5nRqXihq` | `banner-expand-dxc1` | 特殊banner板式设计(dxc) | 设计 | 1650 | 0 | 当用户希望生成一张banner时，启用此技能 |
| 8 | `Xa0EmZ74TP` | `qwen-poster-design` | 千问品牌规范专家 |  | 18220 | 0 | 当用户提到"海报"“logo”“千问logo”"千问海报""品牌海报""做海报""生成海报""设计海报"时，调用此技能。该技能指导如何从千问品牌资产库中选取背景素材（Dark/Mixed/Light弥散背景）和Logo（含反白版），按照千问品牌规范的1/6网格系统、色彩体系、字体规范完成海报的排版与视觉组合。 |
| 9 | `9Sci8SxRg8` | `logo-quick-gen` | Logo 快速生成 | 设计 | 2203 | 2 | 以参考图风格分析为核心驱动，1-2 轮对话快速生成 Logo 图片方案。当用户说「快速做个 Logo」「帮我生成 Logo」「照这个风格做个 Logo」「给我出几个 Logo 方案」「Logo 快速出图」时使用。若用户需要完整品牌策略文档、SVG 代码输出或多轮深度迭代设计，不使用本 Skill，应转交专业 Logo 设计 Skill。 |
| 10 | `rCl16gbbe8` | `pop-toy-ip-design` | 潮玩IP设计专家 |  | 11278 | 6 | 帮助设计师进行专业的、有效的工作流引导，从潮玩IP故事塑形、骨架设计、制作生产工艺规划、盲盒等应用拓展的全链路协助，实现设计师快速、高品质的潮玩IP设计提案。 |
| 11 | `ry8udHibTH` | `eurolocal-skills` | 意大利banner |  | 1409 | 0 | 但用户需要制作banner时，启用此skill |
| 12 | `YOV0ySsFBU` | `world-cup-ai-playbook` | 2026世界杯AI创意专家 |  | 6074 | 56 | 用户仅需提供人物或商品图片及基础需求，此技能将围绕2026年世界杯主题匹配创意玩法，策划并生成统一视觉风格的AI图片、电商套图及社媒海报。 |
| 13 | `DZS9hMxH96` | `fashion-kv-generator` | 服饰kv/banner-G | 设计 | 3200 | 0 | 当用户需要生成服装行业banner或kv时触发。 |
| 14 | `fiAK5tjliw` | `banner-preset-templates` | banner预设模板 |  | 234 | 1 | 当用户在一键拓版插件中点击预设版后，启用此skill |
| 15 | `CpYN45StTs` | `style-image` | 风格定稿 | 设计 | 1739 | 0 | 当用户需要使用Midjourney创作初始的风格图像时，启用此技能 |
| 16 | `Jhte6oq9KJ` | `banner-generator` | 主题场景Banner设计 | 设计 | 3258 | 0 | Generates commercial product banner images with dramatic lighting, gradient backgrounds, and text-safe composition. Use when the user wants to create banner images, product promoti |
| 17 | `xKuKO4al3l` | `d-band-studio` | 金牌音乐制作人 | 音乐创作 | 13642 | 3 | 专业级音乐创作与A&R赏析引擎，输出A/B双版本+5维专业评分+横向对比+推荐结论。当用户需要做BGM、写歌、配乐、创作音乐、评估歌曲质量、提到Suno/Udio类音乐生成需求时使用。不内嵌人设，由上层Agent包装。 |
| 18 | `1frzz7l4kf` | `product-video-prompt` | 商品视频Prompt专家 |  | 7507 | 10 | 当用户上传商品图片并提供商品标题，需要自动完成「物理运动分析 → 视频脚本 → 视频Prompt生成」完整链路时触发。触发关键词：视频脚本、商品展示视频、生成视频prompt、视频prompt、商品视频prompt。不适用于：纯文案创作、静态图片生成、无商品图片的场景。注意：本 Skill 只输出视频 Prompt 文本，不调用视频生成工具。 |
| 19 | `L2Ao70rSho` | `promo-design-diagnosis` | 大促营销设计需求诊断大师 | 设计需求分析 | 3494 | 0 | 当用户提供模糊的大促营销需求、电商活动 Brief、微信聊天记录或初步创意想法时，启动此技能。 核心功能： 1. 扮演资深营销设计策略专家，对输入的需求进行完整性诊断。 2. 评估 Brief 完整度（0-100分），识别缺失的关键信息（如人群、机制、卖点）。 3. 输出必须追问客户的问题清单，挖掘隐藏风险。 4. 将混乱的需求转化为结构化的诊断报告，判断是 |
| 20 | `dsQF43cJvd` | `newscard` | NewsCard - INS 风格图转 HTML | 电商设计 | 5092 | 0 | 当用户需要将 INS 图片转为 HTML、分析图片风格 JSON、生成 NewsCard 风格内容、上传图片进行风格解析、图转 HTML、封面图生成时激活此技能。第三步封面图必须保持参考图语言一致、同类目换不同商品、重写品牌故事，触发关键词：「NewsCard」「INS 图转 HTML」「风格分析」「图片转详情页」「封面图生成」「Card 转化」。 |
| 21 | `mU8bWtJnQk` | `lyrics-skill-1` | 歌词文学助手 |  | 714 | 0 | D-Band的歌词写手 |
| 22 | `Y08gPw2mXC` | `html-builder-v2` | 小应用生成器v2 |  | 23614 | 7 | 当用户要生成html应用，以及画布插件时，使用这个技能。 |
| 23 | `YtHJnGkOq9` | `dband` | DBand |  | 2082 | 0 | AI 音乐制作 Skill。  |
| 24 | `hGT5cc5Mla` | `ip-derivative-design` | 品牌IP应用专家 |  | 11226 | 3 | 基于用户提供的品牌 IP 形象图片，覆盖从基础设计延展到完整周边拓展的全链路输出。能力范围：平面/立体三视图、平面/立体表情包、平面/立体动作库（2×3 网格）；周边拓展含盲盒系列（产品陈列图 + 场景故事海报墙，支持 2D 插画风/3D 潮玩渲染风，5 格无缝拼接，骨架锁定）、IP 竖版海报（9:16）、实物六件套 lookbook（马克杯/帆布袋/手机壳 |
| 25 | `4FiecYAS43` | `d-band` | 金牌音乐制作人 |  | 3961 | 0 | 一个有态度、懂情绪、专注于音乐创作的 Skill，可以将用户的音乐灵感直接转化为可执行的专业生成方案。专注于提供精准的编曲思路、结构设计与专业的音乐提示词，高效实现从创意灵感到真实音乐的制作。 |
| 26 | `VryJaD4f70` | `ppc-visual-generator` |  |  | 31633 | 2 | PPC视觉生成专家。接收 ppc-script-generator 或 internal-ppc-script-gen 输出的结构化交接协议，逐分镜生成AI图片（关键帧），再将关键帧串联生成视频片段，最终输出完整PPC广告视频的视觉素材包。Use when 用户已完成PPC脚本生成，需要进行分镜图片生成或关键帧视频生成。 |
| 27 | `CY0rOqMAKJ` | `ppc-script-generator` |  | PPC｜脚本 | 21216 | 7 | 生成脚本时，修改脚本时，都必须调用此技能 |
| 28 | `fyDw2cwLX8` | `multi-language-translator` | 多语言自动翻译器 | 语言与翻译 | 2203 | 0 | 当用户上传或粘贴任意文字内容，需要翻译成多种语言时激活此技能。触发关键词包括：「翻译」「多语言」「13种语言」「帮我翻译」「生成多语言版本」「translate」「multilingual」。 |
| 29 | `yCge8y6M1A` | `html-ai-app-generator` | AI应用生成器 |  | 15557 | 0 | 使用 HTML-AI-SDK 生成单页 HTML AI 应用。当用户需要创建带有 AI 能力（对话、生图）的单页 HTML 应用、网页原型、AI demo 页面时使用此技能。适用于快速生成一个可直接在浏览器打开运行的、集成 AI 能力的单文件 HTML 页面。 |
| 30 | `tL4r3v3JZI` | `ui-survey-analysis-multilingual` | 电商设计改版用户定量调研分析 | 定量分析，改版测试，用户设计反馈 | 2520 | 1 | 电商页面设计改版用户定量调研分析师，支持多语言问卷结果分析。对电商/产品页面改版的多语言问卷数据进行结构化分析，产出中韩（或中英）双语报告。Use when the user uploads survey CSV data about a page/app redesign, mentions 定量调研分析, UI用户反馈分析，问卷分析, 改版用户评估, p |
| 31 | `hymeLycnvd` | `usability-test-interview-analysis` | 产品可用性测试分析师 | 产品可用性测试 | 4016 | 0 | 对于AI驱动的设计工具（如LLM生图/编辑工具、对话式创作产品、智能设计平台等）在新功能上线后进行可用性测试分析 |
| 32 | `vuh4n1cJcE` | `middle-east-design-kb` |  中东设计助手 |  | 1286 | 0 |  速卖通中东市场品牌设计知识库 — 查询色彩、字体、排版、人物摄影、文化禁忌等全套中东品牌规范，生成AI绘画提示词，提供上线前设计检查清单 |
| 33 | `WL4Xrv6SeW` | `music-analyst` | 音乐分析 |  | 686 | 0 | 音频音乐分析 — 自动扒谱(MIDI)、和弦分析、旋律分析。使用 Basic Pitch + librosa 从音频中提取音符、和弦进行、旋律特征、调性等音乐信息。适用于：上传音频文件分析、扒谱、和弦识别、旋律分析、音乐结构分析、扒歌、和弦提取、调性检测。输入音频文件路径或文件即可自动分析。  |
| 34 | `Fko1lzAcRT` | `storyboard-planner` | storyboard-planner | 影视制作｜分镜 | 53107 | 4 | 影视分镜规划与生成专家。将一句话创意拆解为专业镜头清单（Shot List），生成角色设定图、场景概念图和分镜关键帧，自动置入全能画布。支持载体（短剧/电影/动画等）和题材（动作/悬疑/爱情等）的风格化适配。 |
| 35 | `4XXfxUc1u9` | `mission-cardv1` |  任务面板 skill |  | 5689 | 1 | 关键词中包含”任务面板”的时候启动技能。 |
| 36 | `yIQ4JV6QIy` | `sharp-analyst` | 行业分析师 | 行业分析，多公司汇总综合分析，市场趋势判断 | 3437 | 0 | 行业研判分析师，交叉比对公开市场硬数据，专家访谈，内部私有数据，综合输出结构性机会研判报告。Use when performing industry analysis, multi-company comparative analysis, strategic research on specific sectors, or when the user as |
| 37 | `vxHdjrUuzL` | `album-1` | 专辑封面 |  | 1822 | 0 | 设计录音棚_配套专辑封面 |
| 38 | `gPaHVW2PiR` | `audio-test` | Melody Architect旋律架构，专业的 AI 音乐生成引擎。 |  | 3182 | 0 | Melody Architect旋律架构，一个专业的 AI 音乐生成引擎。 |
| 39 | `eCyvtMlwKR` | `interactive-report-architect` | MD报告转成给人看的交互格式 | 设计、分析 | 8139 | 0 | Transform Markdown analysis reports into immersive, single-file interactive HTML with narrative flow, side navigation, nested collapsible sections, metric grids with sparklines, an |
| 40 | `uuUkPI5AfN` | `aso-image-creator` |  | ASO｜应用商店优化 | 10648 | 25 | Professional ASO (App Store Optimization) image creator. Generates app screenshots from scratch based on brand archive, market, platform, and seasonal requirements. Supports hero s |
| 41 | `0hmqFKPBz4` | `product-card-news` | 商品图文种草设计师 | 设计 | 7943 | 2 | 基于 Kahneman 双系统理论为商品生成 Instagram/小红书爆款 Card News 完整方案,包含 SPEF 情境策展、每张卡的设计思路与 AI 生图提示词、文案生成、自动生图与画布整理。当用户提到「商品种草」「Card News」「小红书图文」「Instagram 轮播」「帮我卖产品」「做一套商品内容」「种草海报」时激活。 |
| 42 | `k4F7KzheYA` | `transcript-cleaning-audit` | 商业访谈逐字稿审计整理 | 初级商业分析，商业逻辑校验 | 1827 | 0 | 将带时间轴的原始1对1商业访谈文字稿，清洗为高信噪比Q&A档案，并进行多维数据审计与逻辑校验。Use when the user uploads interview transcripts, asks to clean/audit verbatim records, or mentions 访谈逐字稿、访谈清洗、逐字稿审计、transcript cleani |
| 43 | `DnZQiedX79` | `marketplace-strategy-research-primary` | 公司基本面分析-仅FOR上市型 | 业务策略分析，单公司分析 | 3333 | 0 | Conducts high-intensity research and logic validation for global e-commerce, supply chain, and AI commercialization strategies. Focuses on information cross-verification, financial |
| 44 | `VNssYjwTbc` | `innovation` | 创新策略 |  | 5900 | 1 | 企业的创新策略引导 |
| 45 | `9RoHkmKfwj` | `detail-page-template-builder` | 详情页模板结构化助手 | 电商设计 | 7316 | 1 | 解析用户提供的电商详情页 HTML 模板，将其拆解为标准化 Section 结构，每个 Section 输出文案内容、图片信息与布局说明的 Markdown 文档。当用户提到"详情页模板解析"、"HTML 转 Section"、"模板结构化"、"详情页模块拆解"、"详情页模版创造"、"生成详情页模版"、"模版助手"时激活。 |
| 46 | `Gbty02dbOV` | `agri-social-card-design` | 农产品社媒图文设计 |  | 9899 | 0 | 根据卡尼曼双系统理论，为农产品生成 7 张卡片式社媒图文（Card News）的完整设计方案，包括每张卡的视觉构图建议、AI 生图提示词、文案生成、心理学策略应用与发布前自检。当用户提到「农产品社媒」「Card News」「小红书图文」「农产品推广」「帮我卖水果/蔬菜」「做一套农产品内容」「农产品海报」时激活。 |
| 47 | `hnKPjHKNRA` | `batch-image-processor` | 批量商品图处理 |  | 1299 | 0 | 对电商商品图进行批量三步处理：① 清除背景/场景中的文字（保留主体物上的文字）；② 按品类规则扩图；③ 裁切至 1775×1440px（不足时自动超分辨率增强）。当用户提到"批量处理图片"、"清除背景文字"、"商品图扩图"、"图片裁切"、"图片标准化"、"商品图批量处理"时激活。 |
| 48 | `K3EmTuy4rW` | `visual-banner-design` | 🌟淘海外清单氛围素材 | 设计 | 2508 | 2 | 根据用户要求进行淘海外清单氛围素材图的生成。 |
| 49 | `u5DhcJg5o4` | `marketing-image-assistant` | 营销图助手 |  | 2582 | 4 | 是一款商业营销视觉图生成技能。支持创建营销海报、广告图、产品推广图等商业视觉内容。当用户提及‘营销图’、‘广告素材’、‘产品展示图’时，自动触发本技能。 |
| 50 | `zwRIZZkfvg` | `web-app-builder-d-design` | UI设计专家 |  | 7623 | 34 | 当用户需要前端设计、网页设计等相关设计时，或帮助用户对于已有的前端设计项目进行优化时，使用此技能。技能包含四轴参数控制 + 8 种风格模式 + 17 项子技能 + 完整输出保障。覆盖从东方审美到机械主义、从 Awwwards 级动效到极简编辑风格的所有高端前端设计场景。 |
| 51 | `E4fB7Zdobp` | `aso-design-reviewer` |  | ASO｜应用商店优化 | 17983 | 47 | Professional ASO design review expert. Evaluates app screenshots across visual design, UX, and conversion optimization. Supports single image review, multi-image comparison, A/B te |
| 52 | `ALHIiJfMbC` | `logo-builder-d-design` | logo-builder-d-design |  | 4492 | 2 | 通过AI 图像生成创建 Logo。讨论风格/比例、生成变体、根据用户反馈迭代。当用户想要创建 Logo、图标、favicon 或品牌标识时使用。 exclusive skill for D.Design。 |
| 53 | `iIwpnlUXBC` | `poster` | 互动游戏海报设计大师 |  | 3796 | 0 | 互动游戏海报延伸设计 |
| 54 | `5zsFAl2Zju` | `playrixs-icon` | icon |  | 4866 | 0 | 图标，icon |
| 55 | `k3YLbvIqXP` | `logo-creator` | Logo创意生成 |  | 3296 | 5 | 用于Logo创意、生成。讨论风格/比例、生成变体、根据用户反馈迭代、裁剪、去背景并导出 SVG。当用户想要创建 Logo、图标、favicon 或品牌标识时使用。 |
| 56 | `Web9Z64AQx` | `impeccable-design` | Impeccable Design |  | 2984 | 26 | 整套高质量前端设计生产线：产出具有创意的页面、精致的代码，避免产出通用化的AI美学风格。适用于构建网页组件、页面、设计稿、海报或应用程序，以及任何需要项目上下文和视觉打磨的设计工作。同时涵盖：响应式适配、动画、无障碍审查、大胆/克制的设计转向、色彩策略、UX 审核、愉悦感设计、简化、生产加固、布局、性能优化、极致特效、最终润色、UX 文案、设计规划和排版。 |
| 57 | `lerBT3HbGk` | `taste-skill-frontend-design-0417` | Hi-END design {git版} |  | 2806 | 8 | 高审美高品味的前端设计，覆盖前端设计的所有场景。审美品味包括：东方审美、Awwwards级别的网页高级滚动动画&电影级效果、奢华柔软设计风格、Notion/Linear风格、工业感的瑞士排版、CRT 终端、数据密集。也适合现有项目设计升级、审核修复。 |
| 58 | `i762pNC4Eq` | `ddesign-poster` | 堆友海报生成器 | 设计 | 1640 | 7 | 当用户提到堆友、D.Design、ddesign、海报生成、活动海报、产品宣传，或需要为 D.Design 平台生成品牌视觉内容时激活此技能。支持社交媒体海报、活动/展览海报、产品功能公告、自定义营销物料，结合 AI 图像生成与 HTML 模板渲染确保品牌一致性。 |
| 59 | `8a2yTVqsyG` | `lowpoly-diplomats-style` | Low Poly 几何插画画风 | 画风 | 1580 | 0 | 当用户需要生成 Low Poly 低多边形几何插画风格的图像时激活此技能。适用于角色设计、场景插画、游戏美术等需要几何多边形拼接风格的场景。 |
| 60 | `ccoouYLCHC` | `visual-badge-design` | 淘海外商详徽章 | 设计 | 1994 | 3 | 严格按照参考资料产出徽章设计，确保所有视觉输出都符合规范，并经过专业审核 |
| 61 | `aTubijhXog` | `detail-page-assistant` | 电商详情页设计专家 |  | 10189 | 38 | 只需输入商品相关内容，即可自动完成详情页的结构规划与视觉设计输出，覆盖卖点提炼、版块布局、视觉呈现等核心环节，帮助商家与设计师快速交付高质量的电商详情页方案。 |
| 62 | `IoTL70arYg` | `newscriptoook` | 新脚本创意1.0 |  | 12621 | 0 | 当说到生成新的创意脚本，或者生成情感驱动的电影视频脚本（30秒/45秒/60秒），使用该技能； |
| 63 | `4z8nPgGWgq` | `virtual-dressing-up` | 虚拟穿戴设计专家 |  | 9103 | 0 | 无论是服饰、鞋帽、首饰、眼镜类等商品图片，均可自动驱动模特完成真实感强的虚拟上身效果，帮助电商、设计师及品牌方高效完成商品视觉呈现。 |
| 64 | `muTCs8uDTn` | `strategic-forecaster` | 战略推演师 | 设计调研 | 7838 | 2 | Strategic trend forecasting and sustainability analysis for e-commerce companies. Synthesizes outputs from the-eye, cognitive-simulator, and strategic-analyst skills, cross-validat |
| 65 | `G5OzDOB9FT` | `strategic-analyst` | 战略分析师 | 设计调研 | 9026 | 3 | Strategic business intelligence analysis combining UI-level micro-insights (from the-eye and cognitive-simulator skills) with macro-level OSINT to infer business models, organizati |
| 66 | `EcK8RRhBG5` | `cognitive-simulator` | 商业认知分析师 | 设计调研 | 5109 | 1 | Cognitive friction analysis of e-commerce UI paths using GOMS/KLM model with regional cultural weights. Receives structured JSON from the-eye skill (component mapping, bounding-box |
| 67 | `MntOt9su1S` | `the-eye` | 视觉语义解析 | 设计调研 | 4835 | 2 | 接收产品截图图片，利用 GPT-4o 或 Claude 3.5 Sonnet 等多模态大模型，对图片进行全方位的语义打点和信息结构化。 多模态抓取： 同时获取整页长截图（用于视觉权重分析）和 DOM 树/HTML 结构（用于提取 CSS 类名）。 关键组件标记： 自动识别并标注页面中的按钮（CTA）、价格标签、倒计时、客服入口坐标。 商业逻辑推断点： * 通 |
| 68 | `1ZSNhgIoE7` | `aidc-design-sys` | AIDC中台设计规范 | 设计 | 41312 | 0 | AIDC（Alibaba International Design System）是一套专业的、以效率为导向的 B 端企业级设计系统，服务于阿里国际的内部产品平台，包括供应链管理、CRO 风控平台、AE/ICBU/Lazada 业务工具以及跨境电商运营系统。设计理念以数据密度、操作清晰度和国际化适配为优先——每一个像素都服务于任务完成，而非视觉装饰。 视觉基 |
| 69 | `KPiYspKMf8` | `runbook-life` | Runbook.life | 数字分身 | 4125 | 16 | 深度聚焦产品设计与交互体验的核心命题，帮助设计师在复杂场景中做出更清晰、更有依据的判断。从产品功能架构的合理性推演，到交互流程的顺畅性评估；从用户需求的精准洞察，到体验细节的打磨优化，都能提供兼具专业性与前瞻性的分析视角，助力打造逻辑自洽、体验友好的产品设计。 |
| 70 | `AVmJOihmU6` | `corporate-slave` | 表情包玩家 |  | 3977 | 2 | 打工人表情包创意 |
| 71 | `Vy7Ms8wmiD` | `brand-creator` | 品牌规范创建 | 平台管理 | 5044 | 0 | 当用户需要新建一套品牌规范，提取设计特征，生成设计token，品牌dna时激活此技能。 |
| 72 | `B5V2hKRzTT` | `skill-creator` | Skill 创建与管理 | 平台管理 | 967 | 2 | 当用户需要创建新的 Skill、查看已有 Skill、迭代优化 Skill 的 Prompt 内容、复制 Skill、或将 Skill 绑定到 Agent 时激活此技能。 |
| 73 | `1r930jLtIQ` | `comfy-app-manager` | ComfyUI 应用管理 | 应用管理 | 3025 | 3 | 当用户需要创建、查询、修改、复制 ComfyUI 应用，或查看可用工作流时激活此技能。支持完整的应用生命周期管理：查看应用列表、获取应用详情、浏览底层工作流、解析工作流节点结构、创建新应用、更新应用配置、复制应用、以及将应用同步为 Agent 工具。 |
| 74 | `3Phqc5BEGa` | `lookasone` | 一致性巡检 |  | 2492 | 2 | 帮助巡检角色、商品、场景、风格的一致性，并自动进行修改 |
| 75 | `ynnPBM581J` | `top-brand-generator` | top-brand-awesomedesign-57 brand { git } |  | 2907 | 57 | 57个不同品牌特质的视觉产出技能：根据57个不同品牌的设计令牌（色彩、字体、组件样式、布局原则），生成品牌风格的 UI 页面图片（落地页、Dashboard、组件展示等）和宣传视觉物料（海报、Banner、社交媒体配图等）。当用户要求生成品牌风格的页面截图、品牌海报、品牌 Banner、或提到基于某个品牌的设计系统生成视觉内容时自动触发（例如"生成 Appl |
| 76 | `15PP72RWQ8` | `aidc-brand-image-review` | AIDC品牌视觉物料审核skill-官方「多元链接」版 |  | 18463 | 0 | 审核图片、海报、横幅、网页、演示文稿等任何视觉素材是否符合阿里国际数字商业集团（AIDC）品牌规范。检查标志使用、品牌色（主色 #FF5000）、字体、辅助图形（多元链接系统）、版式构图及整体品牌一致性。当用户要求审核、检查、验证图片或设计是否符合 AIDC 品牌标准时触发。触发词包括："审核品牌规范"、"品牌审核"、"检查是否符合品牌"、"review b |
| 77 | `QI2vonedZr` | `skill-creator` | Skill 创建 | 平台管理 | 3884 | 3 | 帮助用户创建、查看、迭代Skill。当用户提到创建技能、新建 skill、优化 skill、查看 skill、改 prompt、给 agent 加能力、教 agent 做某事时使用。 |
| 78 | `zet45AKQDb` | `comfy-app-manager` | ComfyUI 应用管理专家 | 应用管理 | 3025 | 3 | 当用户需要创建、查询、修改、复制 ComfyUI 应用，或查看可用工作流时激活此技能。支持完整的应用生命周期管理：查看应用列表、获取应用详情、浏览底层工作流、解析工作流节点结构、创建新应用、更新应用配置、复制应用、以及将应用同步为 Agent 工具。 |
| 79 | `GRFd3ATNnt` | `poster-longimage` | 长图文海报设计专家 |  | 10233 | 2 | 只需输入设计需求，即可自动理解内容意图与视觉诉求，直接输出排版完整、设计感在线的长图文海报，适用于品牌宣传、活动推广、内容传播等多种场景。 |
| 80 | `gySZAI8qzb` | `renwuicon` | 任务icon |  | 3256 | 0 | icon ，任务icon，icon设计，图标 |
| 81 | `OmtKx5K2Nd` | `video-analyzer-pro` | 视频分析 |  | 9551 | 0 | 短视频/长视频深度分析、内容拆解、字幕提取、视觉分析 |
| 82 | `6oBbMXHE95` | `d-service` | 堆友客服小助手 | 客服 | 1912 | 2 | 为用户解决堆友产品功能答疑、快捷键查询、问题故障、会员套餐等问题 |
| 83 | `P3aMUcoGsR` | `longlongago` | 故事家 |  | 2676 | 2 | 讲一个好故事 |
| 84 | `ThjPwJBQkY` | `createoook` | 电商广告创意 |  | 11134 | 2 | 触发语： ● "生成电商广告方案" ● "为{产品}设计主图视频脚本" ● "{品类}广告创意策略" ● "基于这张图生成详情页分镜" |
| 85 | `b00f6c95548c4801adb983f1ad3020fd` | `storyboard` | 故事分镜 |  | 3449 | 1 | 根据故事输入和/或参考图片，生成结构化的9镜头中英双语分镜表格。输出内容包括电影级镜头描述、专业摄影技术参数、图像生成提示词以及视频生成提示词，严格保持角色与场景的一致性。当用户提到"分镜"、"storyboard"、"镜头表"、"shot list"、"分镜脚本"、"shot breakdown"，或需要为AI视频生成规划镜头方案时，请启用此功能。 |
| 86 | `4479ca44d7644667b9c81acfbfe3ac69` | `get-user-question` | 获取banner信息 | 分析 | 1487 | 2 | 当用户的意图为生成banner图像，但并未提供有效内容时，启用skill用于确认banner图像的具体细节内容。 |
| 87 | `5c287c5bf4e44a6ab66afd3ad652df3d` | `frontend-design` | 前端设计 |  | 3957 | 0 | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates crea |
| 88 | `8ea00fe252054c959bf1d20578a8b43d` | `orangeok` | 橙色科技 |  | 28117 | 0 | 当明确说橙色科技、品牌规范的物料设计或者kv设计时，使用技能 |
| 89 | `d932ec0765544a34afb11462ab1b6574` | `one-click-ip-design` | 品牌IP设计专家 |  | 13076 | 19 | 覆盖品牌 IP 设计的完整工作流，帮助设计师告别零散、低效的 IP 设计方式，以结构化的设计思路将品牌特质转化为具有辨识度的 IP 形象。 |
| 90 | `2e72639cbcf742358f09a1ac92208dfb` | `product-image-set-design-expert` | 电商套图设计专家 |  | 26496 | 175 | 用户仅需提供商品图片和商品基础信息或卖点信息，此技能将会围绕商品分析卖点并组织多张商品图片的策划和生成，同时会为用户匹配由Alibaba Design设计师提炼出上百种类目商品表现模板，规划每张图的表现方式，输出统一视觉风格的多张商品图方案。 |
| 91 | `3cbbcc9808b94b9b8cf97b62c62065a4` | `brandprok` | 品牌全案设计专家 |  | 8010 | 3 | 面向品牌创建、升级与提案等场景。从核心概念的建立，到落地的执行方向，厘清品牌的核心价值定位，生成完整品牌提案。 |
| 92 | `e1ed099ad4ce45c4bdae3f6507bc02c2` | `ui-design-insight-analyzer` | UI/UX 设计洞察分析专家 | 设计 | 5074 | 1 | 基于 RAG 检索的 UI 设计数据库，提供竞品对比分析和深度设计洞察报告。擅长从视觉分析数据中提取设计策略，输出结构化的专业分析报告。 |
| 93 | `8d173a67dd2f46b09d258f188032c7a6` | `design-report-expert` | 体验设计汇报专家 | 设计 | 3058 | 1 | 体验设计师汇报专家。帮助 UX/UI/品牌设计师撰写高质量的工作汇报、OKR、周报月报、项目总结、晋升述职等文字内容。擅长将设计工作转化为业务语言，用数据驱动的叙事结构呈现设计价值。当用户说"帮我写汇报"、"润色 OKR"、"优化周报"、"写项目总结"、"准备述职材料"、"KR 怎么写"、"设计价值怎么表达"时使用。 |
| 94 | `36448a6edfa1469bad00bf4c75073c05` | `brandviok` | 网页版vi |  | 16289 | 4 | 当用户需要生成品牌vi、html、分层品牌vi时，使用技能； |
| 95 | `9784e53074ec4fa29af4bc0cb1d64153` | `duiyou-ip-generator` | 堆友IP形象生成器 |  | 2168 | 0 | 堆友IP形象生成器 - 根据用户提供的任何形式输入（图片、诗歌、印象、文字描述等）生成个性化3D玩偶IP形象。当用户提到"生成IP形象"、"创建堆友形象"、"设计我的玩偶"、"想要一个3D角色"、"帮我做个IP"或提供风格偏好想要视觉化呈现时使用此技能。即使用户没有明确说"IP"或"形象"，只要表达了想要基于某种风格/意境/感觉创建角色形象的需求，也应该使用 |
| 96 | `7001649f32194a5a9caaac6bc09911ea` | `creative-planning` | 创意企划 | 企划 | 6712 | 1 | Guide users through a structured product planning workflow covering trend analysis, user persona, creative direction, concept visualization, and deliverable packaging. Use when the |
| 97 | `7ec2c6dc4e9e4c8382e72f964529beb4` | `logosvg` | svg矢量logo设计 | 设计 | 21076 | 0 | 当需要生成或者制作矢量的或者svg格式的logo设计，就使用这个技能； |
| 98 | `da306ca9c10144ca91e1f495ca260d4c` | `accio-logo-skill` | Logo 生成大师 |  | 4033 | 1 | 用户有 Logo 生成需求可启用此 skill |
| 99 | `0bd05b322f144ee6a54d3d528ca71c74` | `logook3` | 品牌Logo设计专家 |  | 13604 | 0 | 将专业 Logo 设计流程压缩至一次对话，无需反复调整，只需告诉它你的品牌名称与行业，从创意到视觉，一步到位。 |
| 100 | `b490e41d67c046898eac54de6afe5080` | `design-method` | 工业设计方法论 | 设计 | 16578 | 68 | 为用户提供工业设计领域内严谨专业的设计方法和流程，仅需输入工具设计项目需求，就可以陪伴用户执行出完整的工业设计项目方案。 |
| 101 | `4c1733f23fa843829eb462a1b1196ca6` | `positioning-statement` | Positioning Statement | 产品 | 8417 | 0 | Create a Geoffrey Moore-style positioning statement that clearly articulates who your product serves, what need it addresses, how it's categorized, what benefit it delivers, and ho |
| 102 | `0815935410bd417395757dfedf4c263a` | `problem-statement` | Problem Statement | 产品 | 9136 | 0 | Articulate a problem from the user's perspective using an empathy-driven framework that captures who they are, what they're trying to do, what's blocking them, why, and how it make |
| 103 | `c84bfddcc80e487f9307bfa9c8459031` | `proto-persona` | Proto Persona | 产品 | 11276 | 0 | Create an initial, assumption-based persona profile that synthesizes available user research, market data, and stakeholder knowledge into a working hypothesis about your target use |
| 104 | `d740eb7607c0476db00191850a808a19` | `discovery-interview-prep` | discovery-interview-prep |  | 17031 | 0 | Guide product managers through preparing for customer discovery interviews by asking adaptive questions about research goals, customer segments, constraints, and methodologies. Use |
| 105 | `c3a572e5e34648c48b5b3080204e56a5` | `jobs-to-be-done` | JTBD 分析 | 产品 | 12092 | 0 | Systematically explore what customers are trying to accomplish (functional, social, emotional jobs), the pains they experience, and the gains they seek. Use this framework to uncov |
| 106 | `68a83d88b81d4a87a3294c2b557a5e37` | `poster-design-agent` | 海报设计专家(弃用) | 海报 Agent | 2418 | 0 | 编排海报和长图文的完整设计流程，包括需求收集、素材分析、策略生成、图片生成四个阶段。当用户说"设计海报"、"生成海报"、"做一张图"、"帮我设计"、"制作宣传图"、"做一张海报"、"生成长图文"、"做个长图"时使用。 |
| 107 | `bf9369d62e584760a614229b0060d685` | `brandok` | 品牌视觉应用专家 |  | 2622 | 0 | 专注品牌视觉体系的系统化延展，生成覆盖视觉规范与全套物料样机的完整品牌视觉方案。确保品牌视觉在所有物料中保持高度一致性与专属感。 |
| 108 | `46b0b154e7bf40dc95ae413cff43fb0a` | `gen-3d-icon` | 3D图标设计专家 | 设计 | 5731 | 0 | 批量生成电商促销、类目导航及 UI 界面等高频图标场景的 3D Icon ，将平台视觉语言参数化，有效提升素材生产效率与视觉一致性。 |