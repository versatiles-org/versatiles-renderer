# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-16

### Features

- add UMD build output for main and maplibre configurations in Rollup

### Bug Fixes

- update @versatiles/style dependency version to 5.9.4 in package.json and package-lock.json
- update MapLibre integration to use UMD build for SVGExportControl
- update UMD build output names for SVGExportControl in Rollup and README

## [0.2.0] - 2026-02-15

### Features

- add RasterStyle and RasterTile interfaces for enhanced rendering options
- enhance getTile function to return content type along with buffer
- implement getRasterTiles function for raster tile retrieval
- add drawRasterTiles method to SVGRenderer for rendering raster tiles
- add type property to regions and generate e2e results for satellite
- update satellite style to disable overlay in SVG rendering
- enhance getLayerFeatures to handle missing source and log errors for invalid configurations
- add drawRasterTiles tests for SVG rendering with various raster styles and filters
- add overlap to raster tile rendering to prevent sub-pixel gaps
- make screenshot images in report clickable for easier access
- add SVG export control for maplibre integration with customizable options
- add MapLibre control tests with SVG export functionality
- add Playwright browser installation and MapLibre E2E test steps to CI workflows
- add development server and initial HTML for SVG export control
- enhance SVG export preview styling for better responsiveness
- update SVG export controls to include Download and Open in Tab buttons
- add maxzoom parameter to calculateTileGrid and update raster source handling
- manage map interactions during SVG export
- update dependency graph to include MapLibre components
- refactor tile handling by moving calculateTileGrid and getTile functions to tiles.ts
- enhance README with detailed usage examples and additional options for renderToSVG
- update MapLibre integration example in README with HTML structure and script tags
- add badges for NPM version, downloads, code coverage, CI status, and license to README

### Bug Fixes

- handle Buffer availability for base64 encoding in getRasterTiles
- correct type checking for vector source in getLayerFeatures function
- update dependency graph structure and correct subgraph references in README
- include README.md in format script for prettier
- update dependencies in package-lock.json and remove unused packages
- update ESLint configuration to use array format for exports
- correct coverage configuration in vitest.config.ts to include and exclude specific files
- update format script in package.json to apply Prettier to all files
- remove unused StyleOptions, TextStyle, and SymbolStyle interfaces from types.ts
- update import paths in demo.ts for consistency
- ensure coverage includes all files in vitest.config.ts
- update actions/checkout and actions/setup-node to version 6
- refactor eslint configuration to use defineConfig and update ignores
- update license from Unlicense to MIT
- update README to format required option for SVGExportControl
- update README to format required option for SVGExportControl
- update license from Unlicense to MIT in package-lock.json

### Code Refactoring

- move style value retrieval functions inside render function for better encapsulation
- move getTile function
- reorganize tile-related interfaces and functions for improved structure
- reorganize dependency graph in README for clarity
- simplify tile array initialization and format drawRasterTiles call

### Chores

- **deps:** bump the action group with 2 updates

### Styles

- format function parameters and imports for improved readability
- improve formatting of style switch cases in getStyle function
- format files

## [0.1.0] - 2026-02-13

### Features

- add @versatiles/style dependency and demo implementation
- add maplibre-gl-js submodule
- add update-maplibre script to package.json for easier submodule updates
- enhance StyleLayer with visibility expression handling and global state references
- update package configuration and add Rollup build setup
- implement renderToSVG function for SVG rendering

### Bug Fixes

- line style
- layer opacity
- background color
- set filename
- reduce image size
- missing id
- update ESLint rules
- some minor eslint errors
- restore compilerOptions in tsconfig.node.json
- add 'ignore = dirty' to maplibre-gl-js submodule configuration
- add git reset to update-maplibre script for consistent state before fetching tags
- update subproject commit for maplibre-gl-js to latest version
- improve error handling for unimplemented layer styles in render function
- ensure tests pass even when no tests are present in the configuration
- add 'declare' to class field declarations to prevent parent assignments from being overwritten
- update @types/node to version 24.10.13 and refactor renderVectorTiles to return SVG string
- remove container from RenderJob and update vector tile fetching logic
- reorganize dependencies in package.json and add missing devDependencies
- improve error handling for unsupported Color arguments
- add checks to skip drawing for transparent polygons and lines
- update tile size calculation to use standard 512px tile size
- update ESLint ignore patterns and source file globbing
- simplify argument handling and type assertions in Color and StyleLayer classes
- include e2e directory in format script for prettier
- update region coordinates and zoom levels for accuracy
- format code for readability and consistency in screenshot generation
- correct zoom level for roma region in regions data
- include SVG size in comparison results and report
- reorder columns in E2E visual comparison report for clarity
- save SVG files for each region and update report to reference them
- add permissions for pages and id-token in E2E workflow
- add doc-graph script to automate dependency graph insertion in README
- update prepack script to include doc-graph generation before build
- update package name and description in package.json
- add missing metadata fields in package.json
- update bundle-stats.html path in rollup configuration
- correct homepage and bugs URLs in package.json
- update E2E workflow to include conditional execution and remove schedule
- enhance CI and E2E workflows with improved step naming and structure
- update README to reflect correct project name and improve clarity

### Code Refactoring

- remove unused console
- event handling and utility functions
- simplify ESLint configuration by consolidating imports and restructuring export
- cleanup types
- simplify type assertions in render function for clarity
- replace magic numbers with Infinity for bbox calculations
- replace magic number with TILE_EXTENT for scaling in getLayerFeatures
- remove console log for missing layer style implementations
- remove commented-out drawText and drawSymbol methods from SVGRenderer
- update .gitignore to include coverage and .DS_Store entries
- update import paths to use .js extensions
- Remove deprecated line and symbol style layer properties and related validation logic
- update zoom level and change SVG output path
- clean up code formatting and improve readability across multiple files
- optimize polygon and line string rendering by grouping paths
- update drawLineStrings to use segments and optimize path generation
- extract segment chaining logic into chainSegments function
- enhance segment chaining logic with normalization phases
- update segment handling in SVGRenderer for improved path generation
- add early returns in drawPolygons and drawLineStrings for empty features and zero opacity
- update SVGRenderer to use segments for path generation and improve point formatting
- replace instance methods with utility functions for point formatting and rounding in SVGRenderer
- remove unnecessary newline in SVGRenderer class
- remove abstract Renderer class and update SVGRenderer implementation

### Documentation

- add readme
- update readme
- smaller view
- add download link
- add line breaks
- update demo.svg
- add E2E visual comparison section with report link to README

### Tests

- add unit tests for Color, Point2D, Feature, and SVGRenderer classes

### Build System

- upgrade dependencies

### CI/CD

- add ci

### Chores

- update dependabot schedule to weekly and adjust versioning strategy
- update dependencies and devDependencies in package.json
- update dependabot configuration to use monthly schedule for npm and GitHub Actions
- update dependencies and devDependencies to latest versions
- update .gitignore and add sync-maplibre script to package.json
- update testing framework to Vitest and add configuration
- upgrade maplibre-gl-style-spec
- remove dependency on @versatiles/container version 1.2.7 from package.json
- clean up package.json and package-lock.json by removing unused dependencies fix: correct casing for 'node' in tsconfig.json types array
- update dependencies in package.json and package-lock.json to latest versions
- add Prettier configuration and update package dependencies
- remove unused file
- add permissions section to CI workflow
- add @vitest/coverage-v8 dependency to package.json
- update package-lock.json with new dependencies and versions
- update @types/node dependency to version 25.2.3
- update GitHub Actions to use latest versions of checkout and setup-node
- reorganize dependencies and remove external references in rollup config
- update rollup configuration and package dependencies
- add source-map-explorer for build analysis and update tsconfig for source maps
- replace source-map-explorer with custom bundle analysis script
- add end-to-end testing scripts and update dependencies for visual comparison
- add E2E visual comparison workflow with scheduled execution

### Styles

- format code

### Other Changes

- initial commit
- stuff
- switch to maplibre spec
- process vector tiles
- stuff
- stuff
- stuff
- stuff
- it basically works
- finally!
- cleanup
- Create LICENSE
- implement polygon merge
- add canvas
- add funding.yml
- minor fixes
- Add demo script to package.json and fix upgrade script formatting
