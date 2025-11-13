import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // Entry point for your SDK
  format: ['esm', 'cjs'], // Output formats (ESM and CommonJS)
  dts: true, // Generate .d.ts files
  tsconfig: 'tsconfig.app.json',
  splitting: false,
  sourcemap: false, // Optional: Generate sourcemaps
  clean: true, // Clear the output directory before building
  external: ['react', 'react-dom'], // Externalize React and ReactDOM
  treeshake: true,
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  noExternal: ['style-loader', 'css-loader'],
  injectStyle: true,
  loader: {
    '.json': 'copy'
  }
});