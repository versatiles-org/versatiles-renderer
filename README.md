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
C["style_layer.ts"]
end
subgraph 5["processor"]
6["render.ts"]
8["raster.ts"]
9["vector.ts"]
A["helper.ts"]
B["styles.ts"]
end
subgraph D["renderer"]
E["renderer_svg.ts"]
end
F["types.ts"]
end
1-->2
2-->4
2-->6
2-->E
6-->7
6-->4
6-->8
6-->B
6-->9
8-->9
9-->4
9-->A
A-->4
B-->C
E-->7

class 0,3,5,D subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```
