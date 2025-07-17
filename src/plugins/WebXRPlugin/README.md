# WebXR Plugin for xeokit-sdk

The WebXR Plugin brings Augmented Reality (AR) capabilities to xeokit-sdk, allowing users to view and interact with 3D models in their real-world environment using WebXR technology and iOS Quick Look.

## Features

- **WebXR AR Support**: Full integration with WebXR Device API for immersive AR experiences
- **iOS Quick Look Integration**: Native iOS AR experience using USDZ files and Quick Look
- **Cross-Platform Compatibility**: Works on ARCore-enabled Android devices and AR-capable iOS devices
- **Dual AR Mode Support**: Automatically selects best AR experience (WebXR vs Quick Look) per platform
- **USDZ File Support**: Full support for iOS USDZ files with Quick Look parameters
- **Hit Testing**: Surface detection for accurate model placement in the real world
- **Interactive Placement**: Tap-to-place functionality with visual feedback
- **Customizable UI**: Configurable AR button with multiple themes and styling options
- **Session Management**: Robust session lifecycle management with error handling
- **Model Scaling**: Dynamic model scaling for optimal AR visualization
- **Touch & Controller Input**: Support for both touch gestures and XR controllers
- **Real-time Rendering**: Efficient WebGL rendering optimized for AR performance
- **iOS Device Detection**: Smart detection of iOS capabilities and ARKit support

## Browser Support

| Browser | Platform | WebXR Support | iOS Quick Look | Overall Support |
|---------|----------|---------------|----------------|-----------------|
| Chrome 79+ | Android (ARCore) | ✅ Full | ❌ N/A | ✅ Full Support |
| Chrome 79+ | iOS (ARKit) | ✅ Limited | ✅ Full | ✅ Full Support |
| Safari 14.5+ | iOS (ARKit) | ✅ Limited | ✅ Full | ✅ Full Support |
| Edge 79+ | Android (ARCore) | ✅ Full | ❌ N/A | ✅ Full Support |
| Firefox | All | ❌ None | ❌ N/A | ❌ Not Supported |

**Requirements:**
- HTTPS connection (required for WebXR)
- WebXR-compatible device OR iOS device with ARKit support
- ARCore (Android) or ARKit (iOS) support
- For iOS: iOS 12.0+ with ARKit-capable device
- For optimal iOS experience: USDZ files for Quick Look AR

## Installation

The WebXR Plugin is included with xeokit-sdk. Import it alongside other xeokit components:

```javascript
import { Viewer, WebXRPlugin, GLTFLoaderPlugin } from "xeokit-sdk";
```

## Basic Usage

### Simple AR Setup

```javascript
// Create viewer
const viewer = new Viewer({
    canvasId: "myCanvas",
    transparent: true
});

// Initialize WebXR plugin with iOS support
const webxr = new WebXRPlugin(viewer, {
    buttonText: "Enter AR",
    buttonEnabled: true,
    arModes: ["webxr", "quick-look"],
    iosSrc: "./models/chair.usdz", // USDZ file for iOS
    iosQuickLookEnabled: true
});

// Load a 3D model
const gltfLoader = new GLTFLoaderPlugin(viewer);
const model = gltfLoader.load({
    id: "myModel",
    src: "./models/chair.gltf"
});

// Check AR support (includes both WebXR and iOS Quick Look)
webxr.supported.then(() => {
    console.log("AR is supported!");
}).catch(() => {
    console.log("AR not supported on this device");
});
```

### Advanced Configuration

```javascript
const webxr = new WebXRPlugin(viewer, {
    // Button configuration
    buttonText: "View in AR",
    exitText: "Exit AR",
    buttonEnabled: true,
    buttonId: "custom-ar-button",
    
    // Behavior settings
    autoHideButton: true,
    hitTestEnabled: true,
    referenceSpace: "local-floor",
    
    // AR mode configuration
    arModes: ["webxr", "quick-look"], // Priority order
    
    // iOS Quick Look settings
    iosSrc: "./models/chair.usdz",
    iosQuickLookEnabled: true,
    
    // Model settings
    modelScale: [1, 1, 1],
    
    // Event callbacks
    onSessionStart: (session) => {
        console.log("AR session started", session);
    },
    onSessionEnd: () => {
        console.log("AR session ended");
    }
});
```

## API Reference

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `buttonText` | String | "AR" | Text displayed on AR button |
| `exitText` | String | "Exit AR" | Text displayed when AR is active |
| `buttonEnabled` | Boolean | true | Whether AR button is initially enabled |
| `buttonId` | String | - | Custom ID for AR button element |
| `buttonElement` | HTMLElement | - | Use existing button element |
| `autoHideButton` | Boolean | true | Hide button when AR not supported |
| `referenceSpace` | String | "local-floor" | WebXR reference space type |
| `hitTestEnabled` | Boolean | true | Enable hit testing for placement |
| `modelScale` | Array | [1,1,1] | Default scale for placed models |
| `arModes` | Array | ["webxr", "quick-look"] | Supported AR modes in priority order |
| `iosSrc` | String | - | URL to USDZ file for iOS Quick Look |
| `iosQuickLookEnabled` | Boolean | true | Enable iOS Quick Look AR support |
| `onSessionStart` | Function | - | Callback when AR session starts |
| `onSessionEnd` | Function | - | Callback when AR session ends |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `supported` | Promise | Promise that resolves if WebXR AR is supported |
| `isPresenting` | Boolean | Whether AR session is currently active |
| `session` | XRSession | Current WebXR session (null if inactive) |
| `buttonElement` | HTMLElement | The AR button DOM element |
| `buttonEnabled` | Boolean | Whether the AR button is enabled |

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `startAR()` | - | Promise | Start an AR session |
| `stopAR()` | - | Promise | Stop the current AR session |
| `placeModel(modelId)` | modelId: String | Boolean | Place model at hit test location |
| `enablePlacementMode(modelId, options)` | modelId: String, options: Object | - | Enable model placement mode |
| `disablePlacementMode()` | - | - | Disable model placement mode |
| `getHitTestResults()` | - | Array | Get current hit test results |
| `isPlacementModeActive()` | - | Boolean | Check if placement mode is active |
| `setIOSSrc(url)` | url: String | - | Set USDZ file URL for iOS |
| `getIOSSrc()` | - | String | Get current iOS USDZ URL |
| `setARModes(modes)` | modes: Array | - | Set supported AR modes |
| `getARModes()` | - | Array | Get supported AR modes |
| `isQuickLookSupported()` | - | Boolean | Check if iOS Quick Look is supported |
| `getIOSCapabilities()` | - | Object | Get iOS device capabilities |
| `createQuickLookLink(options)` | options: Object | HTMLElement | Create iOS Quick Look link |
| `logIOSDebugInfo()` | - | - | Log iOS debug information |

### Events

| Event | Data | Description |
|-------|------|-------------|
| `supported` | - | Fired when WebXR support is confirmed |
| `unsupported` | - | Fired when WebXR is not supported |
| `sessionStarted` | `{session}` | Fired when AR session starts |
| `sessionEnded` | - | Fired when AR session ends |
| `frame` | `{time, frame, hitTestResults}` | Fired for each AR frame |
| `modelPlaced` | `{modelId, position, scale}` | Fired when model is placed |
| `hitTest` | `{position, normal}` | Fired when surface is detected |
| `error` | `{error}` | Fired when an error occurs |

**Note**: When using iOS Quick Look, `sessionStarted` and `sessionEnded` events will include a `mode` property indicating whether "webxr" or "quick-look" was used.

## Usage Examples

### Model Placement with Hit Testing

```javascript
const webxr = new WebXRPlugin(viewer, {
    hitTestEnabled: true
});

// Enable placement mode for a specific model
webxr.on("sessionStarted", (event) => {
    // Check which AR mode is being used
    if (event.mode === "webxr") {
        // WebXR supports interactive placement
        webxr.enablePlacementMode("myModel", {
            scale: [0.5, 0.5, 0.5]
        });
    } else if (event.mode === "quick-look") {
        console.log("iOS Quick Look AR started - placement handled by iOS");
    }
});

// Handle model placement (WebXR only)
webxr.on("modelPlaced", (event) => {
    console.log(`Model ${event.modelId} placed at`, event.position);
    webxr.disablePlacementMode();
});

// Manual placement on touch/click (WebXR only)
document.addEventListener("click", () => {
    if (webxr.isPresenting) {
        webxr.placeModel("myModel");
    }
});
```

### iOS Quick Look Integration

```javascript
// Basic iOS Quick Look setup
const webxr = new WebXRPlugin(viewer, {
    iosSrc: "./models/chair.usdz",
    arModes: ["quick-look", "webxr"] // Prefer Quick Look on iOS
});

// Load model with corresponding USDZ
const model = gltfLoader.load({
    id: "chair",
    src: "./models/chair.gltf"
});

model.on("loaded", () => {
    // Set USDZ source dynamically
    webxr.setIOSSrc("./models/chair.usdz");
});

// Handle different AR modes
webxr.on("sessionStarted", (event) => {
    if (event.mode === "quick-look") {
        console.log("Using iOS Quick Look AR");
        console.log("USDZ URL:", event.url);
    } else {
        console.log("Using WebXR AR");
    }
});

// Create standalone Quick Look link
const quickLookLink = webxr.createQuickLookLink({
    text: "View in AR (iOS)",
    className: "ios-ar-button",
    params: {
        allowsContentScaling: "1",
        planeDetection: "horizontal"
    }
});
document.body.appendChild(quickLookLink);
```

### Multiple Models with USDZ Support

```javascript
const models = {
    chair: {
        gltf: "./models/chair.gltf",
        usdz: "./models/chair.usdz"
    },
    table: {
        gltf: "./models/table.gltf", 
        usdz: "./models/table.usdz"
    }
};

let currentModel = "chair";

// Load model and set corresponding USDZ
function loadModel(modelKey) {
    const modelConfig = models[modelKey];
    
    const model = gltfLoader.load({
        id: modelKey,
        src: modelConfig.gltf
    });
    
    model.on("loaded", () => {
        webxr.setIOSSrc(modelConfig.usdz);
        currentModel = modelKey;
    });
}

// Switch models
function switchModel(newModelKey) {
    loadModel(newModelKey);
}
```

### Custom AR Button Styling

```javascript
// Using custom button element
const customButton = document.createElement("button");
customButton.textContent = "🥽 Enter AR";
customButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(45deg, #007bff, #0056b3);
    color: white;
    border: none;
    padding: 15px 25px;
    border-radius: 25px;
    font-size: 16px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
`;

const webxr = new WebXRPlugin(viewer, {
    buttonElement: customButton,
    buttonEnabled: true
});
```

### iOS Device Detection and Capabilities

```javascript
// Check iOS capabilities
const iosCapabilities = webxr.getIOSCapabilities();
if (iosCapabilities) {
    console.log("iOS Device:", iosCapabilities.isIOS);
    console.log("iOS Version:", iosCapabilities.iosVersion);
    console.log("ARKit Supported:", iosCapabilities.arkitSupported);
    console.log("Quick Look Supported:", iosCapabilities.quickLookSupported);
}

// Debug iOS information
webxr.logIOSDebugInfo();

// Detect best AR mode for device
function getBestARMode() {
    if (webxr.isQuickLookSupported()) {
        return "quick-look";
    } else if (navigator.xr) {
        return "webxr";
    }
    return null;
}

// Set AR modes based on device capabilities
const bestMode = getBestARMode();
if (bestMode) {
    webxr.setARModes([bestMode]);
}
```

### USDZ File Validation and Caching

```javascript
// The plugin automatically validates USDZ URLs
webxr.setIOSSrc("./models/chair.usdz");

// USDZ files are automatically cached for performance
// You can manually manage cache if needed:
const iosUtils = webxr._iosUtils;
if (iosUtils) {
    // Cache USDZ URL
    iosUtils.cacheUSDZ("chair", "./models/chair.usdz");
    
    // Get cached USDZ
    const cached = iosUtils.getCachedUSDZ("chair");
    
    // Clear cache
    iosUtils.clearUSDZCache("chair");
}
```

### Error Handling

```javascript
const webxr = new WebXRPlugin(viewer);

webxr.on("error", (error) => {
    console.error("WebXR Error:", error);
    
    // Show user-friendly error message
    const errorMessages = {
        "WebXR not available": "Your browser doesn't support WebXR AR. Trying iOS Quick Look...",
        "immersive-ar not supported": "WebXR AR is not available. Using iOS Quick Look on supported devices.",
        "Permission denied": "Please allow camera access to use AR features.",
        "iOS source (USDZ) file not specified": "USDZ file required for iOS AR experience.",
        "USDZ file validation failed": "The USDZ file could not be loaded. Please check the URL."
    };
    
    const message = errorMessages[error.message] || "An AR error occurred.";
    alert(message);
});

webxr.supported.catch((error) => {
    // Handle unsupported devices gracefully
    console.log("Primary AR mode not supported:", error);
    
    // Check for fallback options
    if (webxr.isQuickLookSupported()) {
        console.log("iOS Quick Look available as fallback");
        document.getElementById("ar-notice").textContent = 
            "AR available via iOS Quick Look";
    } else {
        document.getElementById("ar-notice").textContent = 
            "AR features are not available on this device.";
    }
});

// Handle iOS-specific errors
webxr.on("sessionStarted", (event) => {
    if (event.mode === "quick-look" && !event.url) {
        console.warn("Quick Look started but no USDZ URL provided");
    }
});
```

## Best Practices

### Performance Optimization

1. **Model Optimization**: Use optimized 3D models with reasonable polygon counts
2. **Texture Compression**: Use compressed texture formats when possible
3. **USDZ Optimization**: Optimize USDZ files for iOS (smaller file sizes load faster)
4. **Minimal Rendering**: Only render what's necessary in AR mode
5. **Efficient Updates**: Avoid unnecessary scene updates during AR sessions
6. **Platform-Specific Optimization**: Use Quick Look on iOS for better performance

```javascript
// Optimize for AR with platform detection
const isIOS = webxr.getIOSCapabilities()?.isIOS;

const model = gltfLoader.load({
    id: "optimized-model",
    src: "./models/chair-optimized.gltf",
    edges: !isIOS, // Disable edges on iOS for Quick Look compatibility
    scale: [0.5, 0.5, 0.5] // Pre-scale to avoid runtime scaling
});

// Use optimized USDZ for iOS
if (isIOS) {
    webxr.setIOSSrc("./models/chair-optimized.usdz");
}
```

### User Experience

1. **Clear Instructions**: Provide clear guidance for AR usage
2. **Progressive Enhancement**: Gracefully handle unsupported devices
3. **Platform-Aware Messages**: Show appropriate instructions for iOS vs Android
4. **Visual Feedback**: Show hit test indicators and placement hints (WebXR only)
5. **Easy Exit**: Always provide a clear way to exit AR mode

```javascript
// Provide platform-aware user guidance
webxr.on("sessionStarted", (event) => {
    if (event.mode === "quick-look") {
        showToast("Use iOS gestures to move, scale, and rotate the model");
    } else {
        showToast("Point your camera at a flat surface to place the model");
    }
});

webxr.on("frame", (event) => {
    // Hit testing only available in WebXR mode
    if (event.hitTestResults) {
        const hasHitTest = event.hitTestResults.length > 0;
        updateUI({ surfaceDetected: hasHitTest });
    }
});

// Platform-specific instructions
function showPlatformInstructions() {
    const iosCapabilities = webxr.getIOSCapabilities();
    
    if (iosCapabilities?.isIOS) {
        showInstructions([
            "Tap 'Enter AR' to launch iOS Quick Look",
            "Use gestures to position the model",
            "Tap the share button to place in your space"
        ]);
    } else {
        showInstructions([
            "Point camera at a flat surface",
            "Tap to place the model",
            "Move around to view from different angles"
        ]);
    }
}
```

### Security Considerations

1. **HTTPS Required**: WebXR only works over HTTPS
2. **Permission Handling**: Handle camera permission requests gracefully
3. **Data Privacy**: Be transparent about camera usage
4. **USDZ File Security**: Ensure USDZ files are served from trusted sources
5. **iOS Privacy**: Quick Look may have additional privacy considerations

### iOS-Specific Considerations

1. **USDZ File Requirements**: iOS requires valid USDZ files for Quick Look AR
2. **File Size Limits**: Large USDZ files may impact loading performance
3. **ARKit Compatibility**: Ensure target devices support ARKit
4. **Safari Limitations**: Some WebXR features may be limited in Safari
5. **Quick Look Parameters**: Use appropriate parameters for different use cases

## Troubleshooting

### Common Issues

**AR Button Not Appearing**
- Ensure device supports WebXR AR or iOS Quick Look
- Check that you're using HTTPS
- Verify browser compatibility
- For iOS: Ensure USDZ file is provided

**Session Won't Start**
- Check camera permissions
- Ensure no other apps are using the camera
- Try refreshing the page
- For iOS: Verify USDZ file URL is accessible

**iOS Quick Look Not Working**
- Ensure device runs iOS 12.0 or later
- Verify USDZ file is valid and accessible
- Check that device supports ARKit
- Ensure USDZ file has correct MIME type

**Poor Tracking Performance** (WebXR only)
- Ensure good lighting conditions
- Look for surfaces with good texture
- Avoid reflective or transparent surfaces

**Models Not Placing Correctly** (WebXR only)
- Check hit test results are available
- Verify model scaling is appropriate
- Ensure reference space is properly configured

**USDZ File Issues**
- Verify USDZ file is properly formatted
- Check file size (large files may be slow to load)
- Ensure HTTPS serving for USDZ files
- Test USDZ file in iOS Safari directly

### Debug Mode

```javascript
const webxr = new WebXRPlugin(viewer, {
    // Enable debug logging
    debug: true
});

// Monitor hit test results (WebXR only)
webxr.on("frame", (event) => {
    if (event.hitTestResults) {
        console.log("Hit test results:", event.hitTestResults.length);
    }
});

// Check session state and mode
webxr.on("sessionStarted", (event) => {
    console.log("Session info:", {
        mode: event.mode,
        session: event.session,
        url: event.url, // For Quick Look
        supportedFeatures: event.session?.enabledFeatures
    });
});

// iOS-specific debugging
webxr.logIOSDebugInfo(); // Logs iOS capabilities to console

// Check USDZ validation
if (webxr._iosUtils) {
    webxr._iosUtils.validateUSDZ("./models/chair.usdz").then(valid => {
        console.log("USDZ validation:", valid);
    });
}

// Monitor AR mode selection
webxr.on("supported", () => {
    const modes = webxr.getARModes();
    const quickLookSupported = webxr.isQuickLookSupported();
    console.log("Supported AR modes:", modes);
    console.log("Quick Look available:", quickLookSupported);
});
```

## Troubleshooting

### Common Issues and Solutions

#### "Failed to construct 'XRWebGLLayer': WebGL context must be marked as XR compatible"

This error occurs when the WebGL context isn't properly configured for WebXR. To fix this:

**Solution 1: Initialize viewer with XR-compatible context (Recommended)**
```javascript
const viewer = new Viewer({
    canvasId: "myCanvas",
    transparent: true,
    contextAttr: {
        xrCompatible: true  // Required for WebXR AR
    }
});
```

**Solution 2: If you already have a viewer instance**
The WebXR plugin will automatically make the existing context XR-compatible using `gl.makeXRCompatible()`. However, it's better to initialize with `xrCompatible: true` from the start.

#### "WebXR not supported" or "immersive-ar not supported"

**Check browser and device support:**
- Chrome 79+ on ARCore-enabled Android devices
- Safari 14.5+ or Chrome on ARKit-compatible iOS devices
- Requires HTTPS connection

**Debugging steps:**
```javascript
// Check WebXR availability
if (!navigator.xr) {
    console.log("WebXR not available in this browser");
} else {
    navigator.xr.isSessionSupported('immersive-ar').then(supported => {
        console.log("AR supported:", supported);
    });
}
```

#### Models not appearing in AR

**Common causes:**
1. Model scale too small or too large
2. Model positioned outside camera view
3. Model not loaded before entering AR

**Solutions:**
```javascript
// Set appropriate scale
webxr.enablePlacementMode("myModel", {
    scale: [0.1, 0.1, 0.1]  // Adjust as needed
});

// Ensure model is loaded
gltfLoader.load({
    id: "myModel",
    src: "./model.gltf"
}).then(() => {
    console.log("Model loaded, AR ready");
});
```

#### Hit testing not working

**Check if hit testing is enabled:**
```javascript
const webxr = new WebXRPlugin(viewer, {
    hitTestEnabled: true,  // Must be true
    referenceSpace: "local-floor"  // Try different reference spaces
});
```

#### iOS devices not entering AR

**For iOS devices, ensure iOS Quick Look is properly configured:**
```javascript
const webxr = new WebXRPlugin(viewer, {
    arModes: ["webxr", "quick-look"],  // Include both modes
    iosSrc: "./model.usdz",  // USDZ file for iOS
    iosQuickLookEnabled: true
});
```

#### Performance issues in AR

**Optimization tips:**
1. Use optimized 3D models (low polygon count)
2. Reduce texture sizes
3. Limit number of visible models
4. Disable unnecessary features

```javascript
// Optimize viewer for AR
const viewer = new Viewer({
    canvasId: "myCanvas",
    transparent: true,
    contextAttr: {
        xrCompatible: true,
        antialias: false  // Disable for better performance
    }
});
```

### Getting Help

If you encounter issues not covered here:

1. Check the browser console for detailed error messages
2. Test on different devices/browsers
3. Verify your 3D models work in non-AR mode first
4. Check the [xeokit-sdk examples](../../examples/) for working implementations

## Contributing

Contributions to the WebXR Plugin are welcome! Please:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test on multiple devices/browsers

## License

The WebXR Plugin is part of xeokit-sdk and is licensed under the same terms (AGPL-3.0).