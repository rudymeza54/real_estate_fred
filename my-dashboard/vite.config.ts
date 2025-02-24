// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // React plugin for Vite
  plugins: [react()],

  // Resolve path aliases
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // TypeScript error handling configuration
  esbuild: {
    // Configure how TypeScript errors are handled during build
    tsconfigRaw: {
      compilerOptions: {
        // Allows implicit 'any' types
        noImplicitAny: false,
        
        // Relaxes strict null checks
        strictNullChecks: false,
        
        // Allows JavaScript files to be compiled
        allowJs: true
      }
    }
  },

  // Build configuration
  build: {
    // Specify output directory
    outDir: 'dist',
    
    // Minimize code
    minify: 'esbuild',
    
    // Generate source maps for debugging
    sourcemap: true
  }
})