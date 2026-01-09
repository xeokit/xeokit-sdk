import { readFile, writeFile } from 'fs/promises';

const SCRIPT_TO_INJECT = `<script>
document.querySelectorAll('a[href^="https://"]').forEach(link => {
  if (!link.href.startsWith('https://xeokit.github.io/xeokit-sdk/docs')) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
});
</script>`;

const filePath = './docs/index.html';
let content = await readFile(filePath, 'utf-8');
content = content.replace('</body>', `${SCRIPT_TO_INJECT}\n</body>`);
await writeFile(filePath, content);
console.log('Processed: docs/index.html');
