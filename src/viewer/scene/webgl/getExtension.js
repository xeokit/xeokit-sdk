/**
 * @private
 */
function getExtension (gl, name) {
    if (gl._cachedExtensions === undefined) {
        gl._cachedExtensions = {};
    }
    if (gl._cachedExtensions[name] !== undefined) {
        return gl._cachedExtensions[name];
    }
    let extension;
    switch (name) {
        case 'WEBGL_depth_texture':
            extension = gl.getExtension('WEBGL_depth_texture') || gl.getExtension('MOZ_WEBGL_depth_texture') || gl.getExtension('WEBKIT_WEBGL_depth_texture');
            break;
        case 'EXT_texture_filter_anisotropic':
            extension = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('MOZ_EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
            break;
        case 'WEBGL_compressed_texture_s3tc':
            extension = gl.getExtension('WEBGL_compressed_texture_s3tc') || gl.getExtension('MOZ_WEBGL_compressed_texture_s3tc') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_s3tc');
            break;
        case 'WEBGL_compressed_texture_pvrtc':
            extension = gl.getExtension('WEBGL_compressed_texture_pvrtc') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc');
            break;
        default:
            extension = gl.getExtension(name);
    }
    gl._cachedExtensions[name] = extension;
    return extension;
}

export {getExtension};