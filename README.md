# VersaTiles Render

Render a map view as image.

Still work in progress!

Run with:

```bash
npm run start
```

Result:

![Example: rendered map view](docs/demo.svg)

[Download SVG](docs/demo.svg)

Currently only SVG is supported. Have a look at `src/renderer/` to add a Canvas renderer.

Currently only background, fill and line layers are supported. Symbol layers could be possible, if we found a good solution for implementing (or using the MapLibre implementation) for "symbol overlap prevention".

## E2E Visual Comparison

A visual comparison report between the SVG renderer and MapLibre GL JS is published to GitHub Pages:

[View Report](https://versatiles-org.github.io/versatiles-renderer/report.html)

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
9["style_layer.ts"]
end
subgraph 5["processor"]
6["render.ts"]
8["styles.ts"]
A["vector.ts"]
B["helper.ts"]
end
subgraph C["renderer"]
D["renderer_svg.ts"]
end
E["types.ts"]
end
1-->2
2-->4
2-->6
2-->D
6-->7
6-->4
6-->8
6-->A
8-->9
A-->4
A-->B
B-->4
D-->7

class 0,3,5,C subgraphs;
classDef subgraphs fill-opacity:0.1, fill:#888, color:#888, stroke:#888;
```
