// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   build: {
//     outDir: 'dist',  // Make sure this matches the publish directory in netlify.toml
//   }
// })
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Use a multi-mode build that creates both a library and a web app
  build: {
    outDir: 'dist',
    
    // Instead of using lib mode, we'll build a regular web app
    // Comment out or remove the lib configuration
    /*
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YourLibraryName',
      fileName: (format) => `index.${format}.js`
    },
    */
    
    // Make sure to generate sourcemaps for easier debugging
    sourcemap: true,
    
    // These options help with library/application hybrid builds
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // This should point to your main HTML file
      }
    }
  }
});