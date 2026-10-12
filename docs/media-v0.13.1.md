# v0.13.1 裝飾圖片與生成提示詞

使用內建 image_gen 工具，共九張採用圖；耐震情境初稿的海浪意象未採用，經一次修改改為建物與抽象振動弧線。未指定或宣稱實際模型版本。

五科圖用於學習總覽與空白紀錄頁；四張小圖作四階段卡的共用裝飾，階段名稱依科目顯示。全部無文字、數字、標籤、箭頭與公式，非計算或施工圖說；題目與圖解作答仍使用原 SVG。

本機原始生成圖保留於 `output/imagegen/ui131/`；網站用圖為 `site/assets/` 下列 JPEG。情境圖 960×640、上限 350,000 bytes；階段小圖 320×320、上限 120,000 bytes。只做等比例縮小與 JPEG 編碼，保留生成原圖。

## 生成提示詞

### `site/assets/topic-structure-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: landscape 3:2. Subject: A slender deep navy architectural portal-frame desk sculpture beside a small abstract triangulated truss sculpture, resting on paper-cut ground. No support symbols, engineering lines or dimension markings.
```

### `site/assets/topic-concrete-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: landscape 3:2. Subject: A warm concrete beam and column corner as an abstract architectural desk sculpture, a hint of matte concrete texture on a quiet folded-paper plinth. No exposed reinforcement, construction details or cutaway.
```

### `site/assets/topic-steel-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: landscape 3:2. Subject: A compact deep navy miniature steel frame sculpture with a diagonal brace and a short plate-girder sculpture, clean geometry. No bolts, connection details, labels, support symbols or construction drawing.
```

### `site/assets/topic-dynamics-v1.jpg`

```text
Edit the provided decorative clay-and-paper illustration. Keep the warm ivory background, soft morning light and navy/teal/amber palette. Replace the ocean waves, cliffs, coastal-house details and tree with a restrained desktop still-life that evokes structural dynamics: a simple slightly tilted rectangular modern building maquette with just a few recessed blank windows on a smooth flat navy circular pedestal. Beside its base put two THIN low-relief teal curved strips lying flat on the ivory ground, like small abstract vibration ripples. NO ocean, NO sea, NO breaking waves, NO cliffs, NO coastline, NO tsunami. The building and base dominate the composition; the two small curved strips are secondary. Landscape 3:2 with generous margin. No people, text, numbers, labels, formulas, arrows, support symbols, watermarks or technical engineering diagrams. Treat this as atmospheric abstract sculpture only.
```

### `site/assets/topic-soil-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: landscape 3:2. Subject: A decorative stack of smooth sandstone-colored earth-like paper and clay layers, topped with a small abstract ivory footing-like block; one thin muted teal ribbon evokes water. A freestanding still-life sculpture, NOT a geological cross-section, no soil markings, foundation design details or stratigraphy labels.
```

### `site/assets/phase-balance-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: square 1:1. Subject: A single balanced matte navy beam-like desk sculpture resting on two rounded clay pebbles, restrained and playful. No mechanical support symbols, force arrows or engineering drawing.
```

### `site/assets/phase-energy-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: square 1:1. Subject: One softly curved thin muted teal clay bar as a minimalist desktop sculpture, with a tiny amber paper accent. No straight baseline, no deflection diagram, no axes or arrows.
```

### `site/assets/phase-compatibility-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: square 1:1. Subject: A matte navy beam-like sculpture on three rounded ivory clay pebbles as a decorative still-life. No mechanical support symbols, force arrows or engineering drawing.
```

### `site/assets/phase-integration-v1.jpg`

```text
Use case: stylized-concept. Asset type: decorative editorial website illustration. Decorative editorial isometric still-life on a uniform warm ivory #f5f3ed background, matte clay and paper-cut materials, soft morning light, restrained palette of deep navy #192e43, muted teal #206f67 and a small amber accent #c79b61. One coherent miniature scene centered with generous margin. No people, no text, no numbers, no labels, no arrows, no formulas, no interface, no watermark. Atmospheric non-technical illustration, not an engineering drawing. Composition: square 1:1. Subject: A neat stack of three entirely blank cream paper sheets with a small navy page corner and a muted teal clay accent. Absolutely no printed lines, marks, letters or equations.
```

## 目視核對

九張採用圖均經目視檢查：色系、紙雕與黏土材質一致；無人物、個資、文字、數字、尺寸、受力箭頭、公式或規範符號。土層、支點與建物只作抽象情境，沒有技術剖面標註或工程判定功能。SHA-256 與用途登錄於 `scripts/public-media.json`。
