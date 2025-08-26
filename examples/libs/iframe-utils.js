window.addEventListener('message', function(event) {
  if (event.data.action === 'getFullUrl') {
    // Send the complete URL back to parent
    event.source.postMessage({
      type: 'fullUrl',
      url: window.location.href
    }, event.origin);
  }
});