// iframe-utils.js
// Utility functions for iframe communication
// Send the full URL (after modification) of the current page to the parent window

document.addEventListener('DOMContentLoaded', function() {
  let url = window.location.href;
  // if html in url, remove it and add # to before last path segment
  if (url.endsWith('.html') && !url.includes('bimviewer.html')) {
    url = url.replace('.html', '');
    const lastSlashIndex = url.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
      url = url.substring(0, lastSlashIndex) + '/#' + url.substring(lastSlashIndex + 1);
    }
  }
  // nested window.parent to reach the top-level parent
  window.parent.window.parent.postMessage({
      type: 'fullUrl',
      url: url,
    }, '*');
  }
);
