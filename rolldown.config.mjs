
import { defineConfig } from 'rolldown';

export default defineConfig({
    input: 'src/index.js',
    output: [
        {
            dir: './dist',
            preserveModules: true
        }
    ],
    watch: {
        include: 'src/**',
        buildDelay: 200, 
    },
});