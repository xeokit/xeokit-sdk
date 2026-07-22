import {sortSplatsByDepth} from "./sortSplats.js";
import {math} from "../../math/math.js";

/*
 * 3D Gaussian Splatting draw pass + drawable (baked RGB, no SH). Ported from the
 * xeokit-sdk-v3 GaussianSplatTechnique, cut down to a dirty PoC:
 *
 *   - self-contained GL pass, one static RGBA32F texture built from the packed
 *     records at load (no streaming SplatBatch);
 *   - synchronous main-thread depth sort on camera move (no worker);
 *   - no section planes, no picking.
 *
 * GaussianSplatRenderer owns the reusable GPU pass. GaussianSplatTechnique is
 * a thin v2 Renderer drawable adapter retained for the standalone loader.
 *
 * Conventions LOCKED from the v3 spike: covariance Sigma = M^T*M (baked in
 * packSplats), and the EWA focal-Y sign is +1 here. If the in-browser result is
 * upside-down / smeared, FOCAL_Y_SIGN is the first value to flip.
 *
 * @private
 */
const FOCAL_Y_SIGN = 1.0;

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uTex;     // RGBA32F, 4 texels/splat
uniform int uTexW;
uniform mat4 uModelView;
uniform mat4 uProj;
uniform vec2 uFocal;
uniform vec2 uViewport;
uniform vec4 uColorize;

in vec2 aCorner;            // quad corner [-2, 2]
in uint aIndex;            // sorted splat item-index

out vec4 vColor;
out vec2 vCorner;

vec4 fetchTexel(int i) {
    int idx = int(aIndex) * 4 + i;
    return texelFetch(uTex, ivec2(idx % uTexW, idx / uTexW), 0);
}

void main() {
    vec4 t0 = fetchTexel(0);
    vec4 t1 = fetchTexel(1);
    vec4 t2 = fetchTexel(2);
    vec4 t3 = fetchTexel(3);

    vColor = vec4(t1.rgb * uColorize.rgb, t0.w * uColorize.a);

    vec4 cam = uModelView * vec4(t0.xyz, 1.0);
    if (cam.z > -0.01) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);   // behind the camera: cull off-screen
        return;
    }

    mat3 Vrk = mat3(t2.x, t2.y, t2.z,
                    t2.y, t3.x, t3.y,
                    t2.z, t3.y, t3.z);
    float z = cam.z;
    mat3 J = mat3(uFocal.x / z, 0.0, -(uFocal.x * cam.x) / (z * z),
                  0.0, ${FOCAL_Y_SIGN.toFixed(1)} * uFocal.y / z, ${(-FOCAL_Y_SIGN).toFixed(1)} * (uFocal.y * cam.y) / (z * z),
                  0.0, 0.0, 0.0);
    mat3 W = transpose(mat3(uModelView));
    mat3 T = W * J;
    mat3 cov2d = transpose(T) * Vrk * T;

    float a = cov2d[0][0] + 0.3;
    float b = cov2d[0][1];
    float c = cov2d[1][1] + 0.3;
    float mid = 0.5 * (a + c);
    float radius = length(vec2(0.5 * (a - c), b));
    float l1 = mid + radius;
    float l2 = mid - radius;
    if (l2 <= 0.0) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);   // degenerate footprint: cull
        return;
    }

    vec2 e1 = normalize(vec2(b, l1 - a));
    vec2 e2 = vec2(e1.y, -e1.x);
    vec2 major = min(sqrt(2.0 * l1), 1024.0) * e1;
    vec2 minor = min(sqrt(2.0 * l2), 1024.0) * e2;

    vec4 clip = uProj * cam;
    vec2 off = (aCorner.x * major + aCorner.y * minor) / uViewport * 2.0 * clip.w;
    gl_Position = vec4(clip.xy + off, clip.zw);
    vCorner = aCorner;
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vCorner;
out vec4 outColor;

void main() {
    float alpha = exp(-dot(vCorner, vCorner)) * vColor.a;
    if (alpha < 0.004) {
        discard;
    }
    outColor = vec4(vColor.rgb * alpha, alpha);   // premultiplied for blendFunc(ONE, 1 - SRC_A)
}
`;

/** Billboard quad corners, expanded by the EWA footprint in the vertex shader. */
const QUAD_CORNERS = new Float32Array([-2, -2, 2, -2, -2, 2, 2, 2]);

/** Texels-per-row of the splat data texture (RGBA32F NPOT is fine in WebGL2). */
const TEX_WIDTH = 4096;

/** True if any of the 16 matrix elements differ (camera-moved test). */
function viewChanged(a, b) {
    for (let i = 0; i < 16; i++) {
        if (a[i] !== b[i]) {
            return true;
        }
    }
    return false;
}

function saveVertexAttrib(gl, location) {
    return {
        enabled: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
        buffer: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
        size: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE),
        type: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_TYPE),
        normalized: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),
        stride: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
        integer: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_INTEGER),
        divisor: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_DIVISOR),
        offset: gl.getVertexAttribOffset(location, gl.VERTEX_ATTRIB_ARRAY_POINTER)
    };
}

function restoreVertexAttrib(gl, location, state) {
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    if (state.buffer) {
        if (state.integer) {
            gl.vertexAttribIPointer(location, state.size, state.type, state.stride, state.offset);
        } else {
            gl.vertexAttribPointer(location, state.size, state.type, state.normalized, state.stride, state.offset);
        }
    }
    gl.vertexAttribDivisor(location, state.divisor);
    if (state.enabled) {
        gl.enableVertexAttribArray(location);
    } else {
        gl.disableVertexAttribArray(location);
    }
}

export class GaussianSplatRenderer {

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {Float32Array} packed - `packSplats` output (count * 16 floats).
     * @param {number} count - number of splats.
     */
    constructor(gl, packed, count) {
        this.gl = gl;

        this._count = count;
        this._packed = packed;
        this._program = null;
        this._texture = null;
        this._texW = TEX_WIDTH;
        this._cornerBuf = null;
        this._idxBuf = null;
        this._lastView = null;
        this._modelView = math.mat4();
        this._modelViewF32 = new Float32Array(16); // camera matrices are Float64 -> copy for uniformMatrix4fv
        this._projF32 = new Float32Array(16);
        this._colorize = new Float32Array([1, 1, 1, 1]);

        // Sort keys: world-space centres (texel0.xyz) + their item-indices,
        // plus the world-space AABB (for camera framing).
        this._centres = new Float32Array(count * 3);
        this._indices = new Uint32Array(count);
        let xmin = Infinity, ymin = Infinity, zmin = Infinity;
        let xmax = -Infinity, ymax = -Infinity, zmax = -Infinity;
        for (let i = 0; i < count; i++) {
            const o = i * 16;
            const x = packed[o], y = packed[o + 1], z = packed[o + 2];
            this._centres[i * 3]     = x;
            this._centres[i * 3 + 1] = y;
            this._centres[i * 3 + 2] = z;
            this._indices[i] = i;
            if (x < xmin) xmin = x; if (x > xmax) xmax = x;
            if (y < ymin) ymin = y; if (y > ymax) ymax = y;
            if (z < zmin) zmin = z; if (z > zmax) zmax = z;
        }
        /** World-space AABB `[xmin,ymin,zmin, xmax,ymax,zmax]` of the splat centres. */
        this.aabb = count ? [xmin, ymin, zmin, xmax, ymax, zmax] : [0, 0, 0, 0, 0, 0];

        this._init();
    }

    _init() {
        const gl = this.gl;
        this._program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
        this._aCorner = gl.getAttribLocation(this._program, "aCorner");
        this._aIndex = gl.getAttribLocation(this._program, "aIndex");
        this._uTex = gl.getUniformLocation(this._program, "uTex");
        this._uTexW = gl.getUniformLocation(this._program, "uTexW");
        this._uModelView = gl.getUniformLocation(this._program, "uModelView");
        this._uProj = gl.getUniformLocation(this._program, "uProj");
        this._uFocal = gl.getUniformLocation(this._program, "uFocal");
        this._uViewport = gl.getUniformLocation(this._program, "uViewport");
        this._uColorize = gl.getUniformLocation(this._program, "uColorize");

        this._cornerBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._cornerBuf);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD_CORNERS, gl.STATIC_DRAW);

        this._idxBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._idxBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this._indices, gl.DYNAMIC_DRAW);

        this._buildTexture();
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    _buildTexture() {
        const gl = this.gl;
        const neededTexels = this._count * 4;                     // 4 texels/splat
        const height = Math.max(1, Math.ceil(neededTexels / TEX_WIDTH));
        const data = new Float32Array(TEX_WIDTH * height * 4);     // RGBA, zero-padded tail
        data.set(this._packed);                                    // count*16 <= width*height*4
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TEX_WIDTH, height, 0, gl.RGBA, gl.FLOAT, data);
        gl.bindTexture(gl.TEXTURE_2D, null);
        this._texture = tex;
        this._texW = TEX_WIDTH;
    }

    renderFrame(frameCtx, params = {}) {
        const gl = this.gl;
        const vp = frameCtx.viewParams;
        this.render(
            params.viewMatrix || vp.viewMatrix,
            vp.projMatrix,
            gl.drawingBufferWidth,
            gl.drawingBufferHeight,
            params.modelMatrix,
            params.colorize
        );
    }

    /**
     * @param {ArrayLike<number>} view column-major world-space view matrix
     * @param {ArrayLike<number>} proj column-major projection matrix
     * @param {number} w drawing-buffer width in px
     * @param {number} h drawing-buffer height in px
     * @param {ArrayLike<number>} [modelMatrix] optional local-to-world/model matrix
     * @param {ArrayLike<number>} [colorize=[1,1,1,1]] RGB multiplier and opacity
     */
    render(view, proj, w, h, modelMatrix = null, colorize = null) {
        if (!this._program || this._count === 0) {
            return;
        }
        const gl = this.gl;
        const modelView = modelMatrix ? math.mulMat4(view, modelMatrix, this._modelView) : view;

        // Sorting and rendering use the same effective model-view transform.
        if (!this._lastView || viewChanged(modelView, this._lastView)) {
            const sorted = sortSplatsByDepth(this._centres, this._indices, modelView);
            gl.bindBuffer(gl.ARRAY_BUFFER, this._idxBuf);
            gl.bufferData(gl.ARRAY_BUFFER, sorted, gl.DYNAMIC_DRAW);
            this._lastView = modelView.slice();
        }

        // Save GL state we touch.
        const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        const prevArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
        const prevActiveTexture = gl.getParameter(gl.ACTIVE_TEXTURE);
        const blendOn = gl.isEnabled(gl.BLEND);
        const cullOn = gl.isEnabled(gl.CULL_FACE);
        const depthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
        const blendEquationRGB = gl.getParameter(gl.BLEND_EQUATION_RGB);
        const blendEquationAlpha = gl.getParameter(gl.BLEND_EQUATION_ALPHA);
        const blendSrcRGB = gl.getParameter(gl.BLEND_SRC_RGB);
        const blendDstRGB = gl.getParameter(gl.BLEND_DST_RGB);
        const blendSrcAlpha = gl.getParameter(gl.BLEND_SRC_ALPHA);
        const blendDstAlpha = gl.getParameter(gl.BLEND_DST_ALPHA);
        const cornerAttrib = saveVertexAttrib(gl, this._aCorner);
        const indexAttrib = saveVertexAttrib(gl, this._aIndex);

        gl.useProgram(this._program);

        this._modelViewF32.set(modelView);
        this._projF32.set(proj);
        this._colorize.set(colorize || [1, 1, 1, 1]);
        const fx = proj[0] * w * 0.5;   // focal length in px, from the camera's own projection
        const fy = proj[5] * h * 0.5;

        gl.activeTexture(gl.TEXTURE0);
        const prevTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
        gl.bindTexture(gl.TEXTURE_2D, this._texture);
        gl.uniform1i(this._uTex, 0);
        gl.uniform1i(this._uTexW, this._texW);
        gl.uniformMatrix4fv(this._uModelView, false, this._modelViewF32);
        gl.uniformMatrix4fv(this._uProj, false, this._projF32);
        gl.uniform2f(this._uFocal, fx, fy);
        gl.uniform2f(this._uViewport, w, h);
        gl.uniform4fv(this._uColorize, this._colorize);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._cornerBuf);
        gl.enableVertexAttribArray(this._aCorner);
        gl.vertexAttribPointer(this._aCorner, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(this._aCorner, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._idxBuf);
        gl.enableVertexAttribArray(this._aIndex);
        gl.vertexAttribIPointer(this._aIndex, 1, gl.UNSIGNED_INT, 0, 0);
        gl.vertexAttribDivisor(this._aIndex, 1);

        // Splats depth-test against opaque geometry but don't write depth, and
        // blend back-to-front with premultiplied "over".
        gl.depthMask(false);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this._count);

        // Restore.
        restoreVertexAttrib(gl, this._aCorner, cornerAttrib);
        restoreVertexAttrib(gl, this._aIndex, indexAttrib);
        gl.depthMask(depthMask);
        if (!blendOn) {
            gl.disable(gl.BLEND);
        }
        gl.blendEquationSeparate(blendEquationRGB, blendEquationAlpha);
        gl.blendFuncSeparate(blendSrcRGB, blendDstRGB, blendSrcAlpha, blendDstAlpha);
        if (cullOn) {
            gl.enable(gl.CULL_FACE);
        }
        gl.bindTexture(gl.TEXTURE_2D, prevTexture);
        gl.activeTexture(prevActiveTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, prevArrayBuffer);
        gl.useProgram(prevProgram);
    }

    destroy() {
        const gl = this.gl;
        if (this._program) {
            gl.deleteProgram(this._program);
        }
        if (this._cornerBuf) {
            gl.deleteBuffer(this._cornerBuf);
        }
        if (this._idxBuf) {
            gl.deleteBuffer(this._idxBuf);
        }
        if (this._texture) {
            gl.deleteTexture(this._texture);
        }
        this._program = null;
        this._cornerBuf = null;
        this._idxBuf = null;
        this._texture = null;
        this._lastView = null;
    }

    rebuild() {
        this.destroy();
        this._init();
    }
}

/**
 * Standalone Renderer drawable adapter retained for GaussianSplatLoader.
 *
 * @private
 */
export class GaussianSplatTechnique extends GaussianSplatRenderer {

    constructor(gl, packed, count) {
        super(gl, packed, count);
        this.type = "GaussianSplats";
        this.isDrawable = true;
        this.isUI = false;
        this.renderOrder = 0;
        this.origin = [0, 0, 0];
        this.visible = true;
        this.culled = false;
        this.pickable = false;
        this.saoEnabled = false;
        this.edges = false;
        this.renderFlags = {culled: false, colorOpaque: false, colorTransparent: true};
    }

    rebuildRenderFlags() {
    }

    drawColorTransparent(frameCtx) {
        this.renderFrame(frameCtx);
    }
}

function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) || "Program link failed";
        gl.deleteProgram(program);
        throw new Error(`[GaussianSplatTechnique] ${info}`);
    }
    return program;
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || "Shader compile failed";
        gl.deleteShader(shader);
        throw new Error(`[GaussianSplatTechnique] ${info}`);
    }
    return shader;
}
