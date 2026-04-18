# 栖知 视觉规范 Visual Spec

> 版本 v0.2 · macOS 桌面应用 · 栖知 DNA 完整版
> 更新：加入栖知 DNA 6 大要素、macOS 桌面应用细节

---

## 一、品牌核心

### 品牌人格
- **温和**：像一个安静、可靠的同伴
- **聪明**：克制中透出专业感
- **有温度**：数据不冷，激励不假
- **东方**：中文语境下的雅致感

### 一句话视觉关键词
> **"晨雾中的青林"** —— 清新、温润、有生命力、不喧哗

---

## 二、栖知 DNA（6 大视觉要素 · 必须每页体现）

栖知的视觉辨识度不是改个颜色就有，而是这 6 个要素的组合：

### 1. 🍃 手绘叶子 SVG 装饰
- 在卡片角落、空白处散落
- 用 SVG path 手画（不要图片）
- 至少 3 种不同形态
- 颜色：栖知青 + opacity 18-30%
- 每个页面至少 3 处叶子点缀

**SVG 示例**（标准款）：
```html
<svg width="40" height="40" viewBox="0 0 40 40" class="qz-leaf">
  <path d="M20 5 Q 8 18, 12 32 Q 24 30, 30 18 Q 28 8, 20 5 Z"
        fill="none" stroke="currentColor" stroke-width="1"/>
  <path d="M20 8 L 20 30" stroke="currentColor" stroke-width="0.5"/>
</svg>
```

### 2. 🖌 东方留白美学
- 间距比常规大 30%
- card 之间 gap-6（24px）甚至 gap-8（32px）
- 卡片内 padding 24-32px
- 不堆砌信息，宁可空着也不挤

### 3. 🌫 柔和层次（噪点纹理 + 渐变）
- 背景不要纯色，用极淡 SVG 噪点纹理叠加
- 色块用渐变不用纯色
- 阴影柔和，不锐利

**共享 CSS 类**：
```css
.qz-noise {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>");
}
```

### 4. ✍ 字体混搭（最关键的 DNA）
- **大标题**：Cormorant Garamond（英文衬线）+ Noto Serif SC（中文衬线）混用
- **正文 / UI**：-apple-system + PingFang SC（无衬线）
- 这种混搭让栖知一眼区别于所有其他 SaaS 产品

**font-family 配置**：
```css
.font-display {
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
  font-weight: 500;
}
.font-body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif;
}
```

### 5. 🎴 每页一句小诗 / 格言
每个页面顶部或合适位置放一句栖知文案，作为情绪锚点：

| 页面 | 格言 |
|---|---|
| 看板 | 见微知著，学有所栖 |
| 学习空间 | 今日所学，明日所栖 |
| 我的目标 | 千里之行，始于栖叶 |
| 资料库 | 厚积薄发，栖于卷帙 |
| 知识图谱 | 万物皆有联，知识自成林 |
| 笔记 | 手抄一遍，胜读十遍 |
| 设置 | 知人者智，自知者明 |
| 学习风格测试 | 识汝所学，方能远行 |

**展示**：思源宋体斜体，13px，灰色 #8A8478

### 6. 💫 「灵」视觉符号
栖知的 AI 助手「灵」有一个统一的视觉符号——**一片栖叶 + 一圈光晕**。
- 出现在所有 AI 对话头像、AI 入口浮窗、空状态
- 直径 32px（标准）/ 24px（小）/ 56px（浮窗大）

**SVG**：
```html
<svg viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="lingGlow">
      <stop offset="0%" stop-color="#5BA593" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#2D7A6B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="16" fill="url(#lingGlow)"/>
  <path d="M16 6 C 12 10, 10 14, 12 20 C 14 24, 18 24, 20 20 C 22 14, 20 10, 16 6 Z"
        fill="#2D7A6B" opacity="0.85"/>
  <line x1="16" y1="14" x2="16" y2="22" stroke="#FFFFFF" stroke-width="0.5" opacity="0.6"/>
</svg>
```

---

## 三、Logo

### Logo 设计方向
- **栖**字（Noto Serif SC）+ 一片叶子 SVG
- 横版用于侧栏：图形 + "栖知" 字样
- 应用图标：仅图形 + 米色背景

### 应用场景
- macOS Dock 图标（.icns）
- Windows 任务栏（.ico）
- 侧栏 Logo（横版）
- 启动页 Splash（大图形 + slogan "见微知著，学有所栖"）

---

## 四、色彩系统

### 4.1 主色 Primary

```
栖知青  #2D7A6B   ← 主色（按钮、强调、品牌识别）
浅栖知  #5BA593   ← hover / 次要强调
深栖知  #1A5448   ← 暗模式主色 / 强对比
```

> 来源灵感：竹林深处的青绿色，沉稳又有生命力

### 4.2 语义色 Semantic

```
成功  #4CAF7C   柔和绿
警告  #E8A93C   温暖橙
危险  #D85959   不刺眼的红
信息  #5B8DEF   温柔蓝
```

### 4.3 中性色（浅色模式）

```
窗口外层    #E8E6E1   ← 桌面应用专属
背景        #FBFAF7   ← 米白底（不是纯白，不刺眼）
卡片背景    #FFFFFF
分隔线      #EFEDE8
次要文本    #8A8478
正文文本    #3A3833
强调文本    #1A1916
```

### 4.4 中性色（暗黑模式）

```
窗口外层    #0E0E0D   ← 桌面应用专属
背景        #141413   ← 不是纯黑
卡片背景    #2A2A28
分隔线      #2A2A28
次要文本    #8A8478
正文文本    #DDD8CE
强调文本    #F5F1E8
```

### 4.5 数据可视化色板

```
节点·掌握    #4CAF7C
节点·学习中  #E8A93C
节点·缺漏    #D85959
曲线·主      #2D7A6B
曲线·辅      #C9D6CE
渐变·暖      linear-gradient(135deg, #F5F2EC, #E8F0EC)
渐变·凉      linear-gradient(135deg, #E8F0EC, #D8E8E2)
```

---

## 五、字体

### 5.1 字体家族

**英文**：
```
Display:  Cormorant Garamond  ← 标题、品牌字（衬线）
UI:       -apple-system, SF Pro Text  ← UI 文字（无衬线）
Mono:     SF Mono / JetBrains Mono  ← 代码
```

**中文**：
```
Display:  Noto Serif SC  ← 标题、格言（思源宋体）
UI:       PingFang SC, HarmonyOS Sans  ← UI 文字
```

### 5.2 字号阶梯（macOS 桌面 App）

```
Display    36 / 44px   超大标题（问候、Hero）
H1         24 / 32px   页面主标题
H2         18 / 26px   模块标题
H3         15 / 22px   卡片标题
Body       13 / 20px   正文（macOS 默认）
Caption    11 / 16px   说明文字
Tiny       10 / 14px   极小标签
```

> 注意：桌面 App 字号比 Web 小（13px 是 macOS 标准），密度更高

### 5.3 字重

```
Regular    400   正文
Medium     500   UI 文字、卡片标题
Semibold   600   重要标题
Bold       700   强调（克制使用）
```

### 5.4 字体混搭原则

- **品牌时刻**（问候、Hero、格言）：Cormorant + Noto Serif SC
- **页面级标题**：Cormorant + Noto Serif SC
- **模块标题**：可用 -apple-system + PingFang
- **正文 / UI**：-apple-system + PingFang
- **数据数字**（如"6.2h"）：Cormorant Garamond（让数字优雅）

---

## 六、间距系统

基于 **4px 栅格**：

```
xxs    4px
xs     8px
sm    12px
md    16px
lg    24px   ← 卡片间距默认
xl    32px   ← 卡片内边距默认
2xl   48px
3xl   64px
```

> 比常规 SaaS 用得宽松 30%，体现东方留白

---

## 七、圆角

```
Sharp   2px    标签、徽章
Soft    6px    macOS 输入框
Button  8px    按钮
Card   12px    卡片（macOS 标准）
Hero   16px    大块容器
Pill   999px   圆角胶囊
```

---

## 八、阴影

**克制使用**，体现 macOS 原生质感：

```
窗口阴影   0 20px 60px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.08)
卡片 sm   0 1px 3px rgba(0,0,0,0.04)
卡片 md   0 4px 12px rgba(0,0,0,0.08)
浮窗 lg   0 12px 32px rgba(0,0,0,0.12)
```

暗模式下用更深一些（黑底 0.4 透明度）。

---

## 九、动效

### 9.1 时长

```
Instant    100ms   微反馈（hover、点击）
Quick      200ms   按钮、tab 切换
Smooth     300ms   卡片进入、模态展开
Gentle     500ms   页面切换、大块动画
```

### 9.2 缓动函数

```
Default:   cubic-bezier(0.4, 0, 0.2, 1)       通用
Spring:    cubic-bezier(0.34, 1.56, 0.64, 1)  弹性反馈
Ease-out:  cubic-bezier(0, 0, 0.2, 1)         进入
Ease-in:   cubic-bezier(0.4, 0, 1, 1)         退出
```

### 9.3 「灵」呼吸动画

```css
@keyframes ling-breath {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.95; }
}
.qz-ling-float {
  animation: ling-breath 3s ease-in-out infinite;
}
```

### 9.4 动效原则
- **不为动而动**：每个动效要解释"发生了什么"
- **保持节奏**：同类操作动效一致
- **可关闭**：尊重 macOS"减少动态效果"系统设置

---

## 十、图标

- 图标库：**Lucide React**（线性、统一、与 macOS SF Symbols 风格契合）
- 默认尺寸：16px（macOS UI 密度）
- 大图标：20px（卡片头部）
- 描边：1.25-1.5px

---

## 十一、组件原则

### 按钮

**Primary**（栖知青底白字）：
- 高度 32px / 圆角 8px
- 字号 13px medium
- macOS 风内阴影 + 微妙渐变

**Secondary**（透明描边）：
- 高度 32px / 圆角 8px
- 边框：栖知青 1px / 文字栖知青

**Ghost**（纯文字）：
- 无背景，hover 显淡灰

### 输入框
- 高度 32px / 圆角 6px（macOS 标准）
- 边框：rgba(0,0,0,0.1)
- focus 时栖知青 + 内嵌阴影

### 卡片
- 白底 / 圆角 12px / sm 阴影
- 内边距 24px
- hover：md 阴影 + translateY(-1px)

### 模态框
- 居中
- 背景遮罩 rgba(0,0,0,0.4) + 模糊
- 进入：fade + scale(0.96 → 1)

### 滚动条
- macOS 风：细、半透明、hover 才出现
```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
```

---

## 十二、文案语气

**栖知的"声音"**：

✅ 应该是这样：
- "今天还有 2 个任务，慢慢来"
- "学了 3 天，是不是该复习一下啦"
- "这个有点难，要不换种讲法？"
- "见微知著，学有所栖"

❌ 不要这样：
- "您当前有 2 个任务待处理"（太官方）
- "立即开始学习！"（太鸡血）
- "您的学习进度落后"（太焦虑）
- "Loading..."（太冷漠）

---

## 十三、品牌资产清单

### 已有
- ✅ 配色系统
- ✅ 字体方案（Cormorant + Noto Serif SC + Inter + PingFang）
- ✅ 「灵」视觉符号 SVG
- ✅ 手绘叶子 SVG（3 种形态待补全）
- ✅ 噪点纹理 SVG

### 待做
- [ ] Logo（横版 + 应用图标 .icns/.ico）
- [ ] 字体打包（开源字体本地化）
- [ ] 完整图标集（用 Lucide）
- [ ] 启动页 Splash 插画
- [ ] 空状态插画
- [ ] 成就徽章设计（3-10 个）
- [ ] 「灵」表情包（不同状态：开心/思考/担心/鼓励）

---

## 十四、设计验收 Checklist

每做完一个页面，对照：

- [ ] 是否有 macOS 窗口框架（红黄绿三圆点）
- [ ] 是否有毛玻璃侧栏
- [ ] 是否有手绘叶子装饰（至少 3 处）
- [ ] 是否有页面格言
- [ ] 标题是否用 Cormorant + Noto Serif SC 混搭
- [ ] 是否用了栖知青 #2D7A6B 主色
- [ ] 留白是否充足（不要堆砌）
- [ ] 暗黑模式是否适配
- [ ] 「灵」符号是否一致
- [ ] 动效是否克制有节奏
