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
