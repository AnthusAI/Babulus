# VideoML Homepage Structure

Visual overview of the redesigned homepage sections.

## 1. Hero Section (Above the Fold)
```
┌─────────────────────────────────────────────────────────────────┐
│                      [Purple Gradient Background]               │
│                                                                 │
│                  Declarative Video Composition                  │
│                                                                 │
│     VideoML brings the power of markup languages to video       │
│          editing. Write videos like you write web pages -       │
│              declarative, composable, and browser-native.       │
│                                                                 │
│          [Read the Spec Button]  [View Examples Button]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Immediate impact, clear value proposition
**Design**: Purple gradient, large bold text, prominent CTAs
**Copy Focus**: "Like writing web pages" - familiar analogy

---

## 2. Problem/Solution Section
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                  The Video Programming Problem                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              [Yellow Background - Problem]              │  │
│  │                   Current Challenges                    │  │
│  │  • Imperative complexity                                │  │
│  │  • No standard representation                           │  │
│  │  • Poor composability                                   │  │
│  │  • Time as an afterthought                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              [Green Background - Solution]              │  │
│  │                    VideoML Solution                     │  │
│  │  • Declarative by design                                │  │
│  │  • XML-based standard                                   │  │
│  │  • Time as first-class                                  │  │
│  │  • Browser-native runtime                               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Frame the problem VideoML solves
**Design**: Contrasting colored boxes (problem = yellow, solution = green)
**Copy Focus**: Pain points vs. benefits

---

## 3. Simple Example Section
```
┌─────────────────────────────────────────────────────────────────┐
│                  [Light Gray Background]                        │
│                                                                 │
│                      Simple Yet Powerful                        │
│              Create complete videos with clean,                 │
│                    readable markup                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Dark Code Block with Copy Button]                      │  │
│  │ <videoml title="Welcome Video" fps="30">                │  │
│  │   <scene id="intro" duration="3s">                      │  │
│  │     <layer z="10">                                      │  │
│  │       <title-slide                                      │  │
│  │         title="Welcome"                                 │  │
│  │         subtitle="to VideoML" />                        │  │
│  │     </layer>                                            │  │
│  │   </scene>                                              │  │
│  │                                                         │  │
│  │   <scene id="content">                                  │  │
│  │     <cue>Let me show you how it works.</cue>           │  │
│  │   </scene>                                              │  │
│  │ </videoml>                                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ℹ️  Automatic Duration                                  │  │
│  │ Notice the second scene has no duration specified?      │  │
│  │ VideoML automatically calculates it from the cue        │  │
│  │ length. Time becomes a layout dimension...              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Show code immediately, prove simplicity
**Design**: Code block with syntax highlighting, info callout
**Copy Focus**: "Automatic duration" - key differentiator

---

## 4. Key Features Grid
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         Key Features                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │     🎯       │  │     🔧       │  │     📦       │        │
│  │ Time as      │  │ Browser-     │  │ Composable   │        │
│  │ Layout       │  │ Native       │  │              │        │
│  │              │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │     🎨       │  │     ⚡       │  │     🔌       │        │
│  │ Declarative  │  │ Production-  │  │ Extensible   │        │
│  │              │  │ Tested       │  │              │        │
│  │              │  │              │  │              │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Quickly communicate all major benefits
**Design**: 3x2 grid of feature cards with icons
**Copy Focus**: Each card = one clear benefit

---

## 5. Complex Example Section
```
┌─────────────────────────────────────────────────────────────────┐
│                  [Light Gray Background]                        │
│                                                                 │
│                 Scale to Complex Productions                    │
│          Handle multi-layer compositions with the               │
│                    same clean syntax                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [Dark Code Block - Longer Example]                      │  │
│  │ <videoml title="Product Demo" ...>                      │  │
│  │   <!-- Title Scene -->                                  │  │
│  │   <scene id="intro" duration="4s">                      │  │
│  │     <layer z="10">                                      │  │
│  │       <text ... animate="fadeIn">                       │  │
│  │         Product Demo                                    │  │
│  │       </text>                                           │  │
│  │     </layer>                                            │  │
│  │     <layer z="5">                                       │  │
│  │       <background color="#667eea" />                    │  │
│  │     </layer>                                            │  │
│  │   </scene>                                              │  │
│  │   ...                                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Show it scales to real-world complexity
**Design**: Longer code example, still readable
**Copy Focus**: "Same clean syntax" at scale

---

## 6. Code Comparison Section
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    Why Not Just Use Code?                       │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │ [Yellow - Problem]       │  │ [Green - Solution]       │   │
│  │ Traditional Video APIs   │  │ VideoML                  │   │
│  │                          │  │                          │   │
│  │ const scene = new...     │  │ <scene duration="3s">    │   │
│  │ scene.setDuration...     │  │   <layer z="10">         │   │
│  │ const layer = new...     │  │     <text x="center">    │   │
│  │ layer.setZ(10);          │  │       Welcome            │   │
│  │ const text = new...      │  │     </text>              │   │
│  │ text.setPosition...      │  │   </layer>               │   │
│  │ layer.add(text);         │  │ </scene>                 │   │
│  │ scene.add(layer);        │  │                          │   │
│  │ video.add(scene);        │  │                          │   │
│  │ video.render();          │  │                          │   │
│  │                          │  │                          │   │
│  │ Imperative, verbose      │  │ Declarative, concise     │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ ✓  Best of Both Worlds                                  │  │
│  │ VideoML gives you the clarity of markup with the        │  │
│  │ power of programmatic access via the VOM runtime        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Direct comparison showing advantage
**Design**: Side-by-side colored boxes
**Copy Focus**: Visual proof that VideoML is better

---

## 7. Community CTA Section
```
┌─────────────────────────────────────────────────────────────────┐
│                      [Purple Gradient Background]               │
│                                                                 │
│                  Join the VideoML Community                     │
│                                                                 │
│     VideoML is a draft specification built on production        │
│     experience. We're proposing it as a standard for            │
│            declarative video composition.                       │
│                                                                 │
│     [Read Full Specification]  [View on GitHub]                │
│                                                                 │
│           Draft Specification v0.1 - Based on Babulus           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Purpose**: Clear next steps, builds credibility
**Design**: Matches hero section, bookends the page
**Copy Focus**: "Production experience" - not theoretical

---

## Navigation (Sticky)
```
┌─────────────────────────────────────────────────────────────────┐
│  VideoML                  Specification | GitHub                │
└─────────────────────────────────────────────────────────────────┘
```

**Design**: Sticky top navigation, blur effect
**Links**: Spec, Examples, Runtime, GitHub

---

## Footer
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  VideoML                Documentation           Resources       │
│  An XML-based           Specification           GitHub Repo     │
│  markup language        Examples                Contributing    │
│  for declarative        Runtime API             Changelog       │
│  video composition                                              │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│     VideoML Draft Specification v0.1 - Built with production    │
│                   experience from Babulus                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Strategy

### Visual Hierarchy
1. **Hero**: Immediate attention with gradient and large text
2. **Problem/Solution**: Colored boxes create visual contrast
3. **Examples**: Code blocks break up text, show don't tell
4. **Features**: Grid layout, scannable
5. **Comparison**: Side-by-side drives home the benefit
6. **CTA**: Matches hero, creates closure

### Color Usage
- **Purple Gradient**: Hero and final CTA (memorable bookends)
- **Alternating Backgrounds**: White and light gray sections
- **Yellow/Green Boxes**: Problem vs. solution contrast
- **Dark Code Blocks**: Professional, readable

### Copy Strategy
- **Hero**: Big promise (declarative video composition)
- **Problem/Solution**: Frame the pain and the cure
- **Examples**: Show the syntax immediately
- **Features**: Bullet points of benefits
- **Comparison**: Visual proof of superiority
- **CTA**: Credibility (production experience) + next steps

### Engagement Techniques
1. **Progressive disclosure**: Simple example first, complex second
2. **Visual variety**: Mix text, code, cards, callouts
3. **Narrative flow**: Problem → Solution → Proof → Action
4. **Credibility signals**: "Production-tested", "Babulus", "v0.1"
5. **Clear CTAs**: Always know what to do next

### Mobile Considerations
- All grids collapse to single column
- Typography scales down
- Code blocks scroll horizontally if needed
- Touch-friendly button sizes
- Generous spacing maintained

---

## Key Differentiators Highlighted

1. **Time as Layout Dimension**: Featured in hero, features, examples
2. **Declarative Syntax**: Shown in every code example
3. **Browser-Native (VOM)**: Featured prominently
4. **Production-Tested**: Credibility signal throughout
5. **Automatic Duration**: Called out in example callout

The homepage tells a complete story: VideoML solves real problems with an elegant solution, and it's proven in production. Every section reinforces this narrative.
