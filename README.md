# VersaTiles SVG Renderer

Renders vector maps as SVG.

![Example: rendered map view](docs/demo.svg)

[Download SVG](docs/demo.svg)

Currently only background, fill and line layers are supported.

## E2E Visual Comparison

A visual comparison report between the SVG renderer and MapLibre GL JS is published to GitHub Pages:

[View Report](https://versatiles-org.github.io/versatiles-svg-renderer/report.html)

## Dependency Graph

<!--- This chapter is generated automatically --->

```mermaid
---
config:
  layout: elk
---
flowchart TB

subgraph 0["src"]
1["demo.ts"]
2["index.ts"]
subgraph 3["lib"]
4["geometry.ts"]
7["color.ts"]
B["style_layer.ts"]
end
subgraph 5["processor"]
6["render.ts"]
8["raster.ts"]
9["tiles.ts"]
A["styles.ts"]
C["vector.ts"]
D["helper.ts"]
end
subgraph E["renderer"]
F["renderer_svg.ts"]
end
subgraph G["maplibre"]
H["control.ts"]
I["styles.ts"]
J["index.ts"]
end
K["types.ts"]
end
1-->2
2-->4
2-->6
2-->F
6-->7
6-->4
6-->8
6-->A
6-->C
8-->9
A-->B
C-->4
C-->D
C-->9
D-->4
F-->7
H-->2
H-->I
J-->2
J-->H

class 0,3,5,E,G subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```
