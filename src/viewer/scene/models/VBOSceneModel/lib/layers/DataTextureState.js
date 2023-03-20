import { createRTCViewMat } from "../../../../math/rtcCoords.js";

// Imports used to complete the JSDocs arguments to methods
import { Program } from "../../../../webgl/Program.js"
import { Camera } from "../../../../camera/Camera.js"
import { Scene } from "../../../../scene/Scene.js"

const identityMatrix = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];

const dataTextureRamStats = {
    sizeDataColorsAndFlags: 0,
    sizeDataPositionDecodeMatrices: 0,
    sizeDataTextureOffsets: 0,
    sizeDataTexturePositions: 0,
    sizeDataTextureIndices: 0,
    sizeDataTextureEdgeIndices: 0,
    sizeDataTexturePortionIds: 0,
    numberOfGeometries: 0,
    numberOfPortions: 0,
    numberOfLayers: 0,
    totalPolygons: 0,
    totalPolygons8Bits: 0,
    totalPolygons16Bits: 0,
    totalPolygons32Bits: 0,
    totalEdges: 0,
    totalEdges8Bits: 0,
    totalEdges16Bits: 0,
    totalEdges32Bits: 0,
    cannotCreatePortion: {
        because10BitsObjectId: 0,
        becauseTextureSize: 0,
    },
    overheadSizeAlignementIndices: 0, 
    overheadSizeAlignementEdgeIndices: 0, 
};

window.printDataTextureRamStats = function () {
    console.log (JSON.stringify(dataTextureRamStats, null, 4));

    let totalRamSize = 0;

    Object.keys(dataTextureRamStats).forEach (key => {
        if (key.startsWith ("size")) {
            totalRamSize+=dataTextureRamStats[key];
        }
    });

    console.log (`Total size ${totalRamSize} bytes (${(totalRamSize/1000/1000).toFixed(2)} MB)`);
    console.log (`Avg bytes / triangle: ${(totalRamSize / dataTextureRamStats.totalPolygons).toFixed(2)}`);

    let percentualRamStats = {};

    Object.keys(dataTextureRamStats).forEach (key => {
        if (key.startsWith ("size")) {
            percentualRamStats[key] = 
                `${(dataTextureRamStats[key] / totalRamSize * 100).toFixed(2)} % of total`;
        }
    });

    console.log (JSON.stringify({percentualRamUsage: percentualRamStats}, null, 4));
};

class BindableDataTexture
{
    /**
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {WebGLTexture} texture 
     * @param {int} textureWidth 
     * @param {int} textureHeight 
     * @param {TypedArray} textureData 
     */
    constructor(gl, texture, textureWidth, textureHeight, textureData = null)
    {
        /**
         * The WebGL context.
         * 
         * @type WebGL2RenderingContext
         * @private
         */
        this._gl = gl;

        /**
         * The WebGLTexture handle.
         * 
         * @type {WebGLTexture}
         * @private
         */
        this._texture = texture;

        /**
         * The texture width.
         * 
         * @type {number}
         * @private
         */
        this._textureWidth = textureWidth;

        /**
         * The texture height.
         * 
         * @type {number}
         * @private
         */
        this._textureHeight = textureHeight;

         /**
          * (nullable) When the texture data array is kept in the JS side, it will be stored here.
          * 
          * @type {TypedArray}
          * @private
          */
        this._textureData = textureData;
    }

    /**
     * Convenience method to be used by the renderers to bind the texture before draw calls.
     * 
     * @param {Program} glProgram 
     * @param {string} shaderName The name of the shader attribute
     * @param {number} glTextureUnit The WebGL texture unit
     * 
     * @returns {bool}
     */
    bindTexture (glProgram, shaderName, glTextureUnit) {
        return glProgram.bindTexture (shaderName, this, glTextureUnit);
    }

    /**
     * 
     * Used internally by the `program` passed to `bindTexture` in order to bind the texture to an active `texture-unit`.
     * 
     * @param {number} unit The WebGL texture unit
     * 
     * @returns {bool}
     * @private
     */
    bind (unit) {
        this._gl.activeTexture(this._gl["TEXTURE" + unit]);
        this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
        return true;
    }

    /**
     * Used internally by the `program` passed to `bindTexture` in order to bind the texture to an active `texture-unit`.
     * 
     * @param {number} unit The WebGL texture unit
     * @private
     */
    unbind (unit) {
        // This `unbind` method is ignored at the moment to allow avoiding to rebind same texture already bound to a texture unit.

        // this._gl.activeTexture(this.state.gl["TEXTURE" + unit]);
        // this._gl.bindTexture(this.state.gl.TEXTURE_2D, null);
    }
}

class DataTextureBuffer
{
    constructor ()
    {
        this.positions = [];
        this.indices8Bits = [];
        this.indices16Bits = [];
        this.indices32Bits = [];
        this.edgeIndices8Bits = [];
        this.edgeIndices16Bits = [];
        this.edgeIndices32Bits = [];
        this.edgeIndices = [];
        this._objectDataColors = [];
        this._objectDataPickColors = [];
        this._vertexBasesForObject = [];
        this._indexBaseOffsetsForObject = [];
        this._edgeIndexBaseOffsetsForObject = [];
        this._objectDataPositionsMatrices = [];
        this._objectDataInstanceGeometryMatrices = [];
        this._objectDataInstanceNormalsMatrices = [];
        this._portionIdForIndices8Bits = [];
        this._portionIdForIndices16Bits = [];
        this._portionIdForIndices32Bits = [];
        this._portionIdForEdges8Bits = [];
        this._portionIdForEdges16Bits = [];
        this._portionIdForEdges32Bits = [];
        this._portionIdFanOut = [];
    }
}

class DataTextureState
{
    constructor ()
    {
        /**
         * Texture that holds colors/pickColors/flags/flags2 per-object:
         * - columns: one concept per column => color / pick-color / ...
         * - row: the object Id
         * 
         * @type BindableDataTexture
         */
        this.texturePerObjectIdColorsAndFlags = null;

        /**
         * Texture that holds the XYZ offsets per-object:
         * - columns: just 1 column with the XYZ-offset
         * - row: the object Id
         * 
         * @type BindableDataTexture
         */
        this.texturePerObjectIdOffsets = null;

        /**
         * Texture that holds the positionsDecodeMatrix per-object:
         * - columns: each column is one column of the matrix
         * - row: the object Id
         * 
         * @type BindableDataTexture
         */
        this.texturePerObjectIdPositionsDecodeMatrix = null;

        /**
         * Texture that holds all the `different-vertices` used by the layer.
         * 
         * @type BindableDataTexture
         */            
        this.texturePerVertexIdCoordinates = null;

        /**
         * Texture that holds the PortionId that corresponds to a given polygon-id.
         * 
         * Variant of the texture for 8-bit based polygon-ids.
         * 
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdPortionIds8Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given polygon-id.
         * 
         * Variant of the texture for 16-bit based polygon-ids.
         * 
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdPortionIds16Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given polygon-id.
         * 
         * Variant of the texture for 32-bit based polygon-ids.
         * 
         * @type BindableDataTexture
         */
        this.texturePerPolygonIdPortionIds32Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given edge-id.
         * 
         * Variant of the texture for 8-bit based polygon-ids.
         * 
         * @type BindableDataTexture
         */
        this.texturePerEdgeIdPortionIds8Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given edge-id.
         * 
         * Variant of the texture for 16-bit based polygon-ids.
         * 
         * @type BindableDataTexture
         */
        this.texturePerEdgeIdPortionIds16Bits = null;

        /**
         * Texture that holds the PortionId that corresponds to a given edge-id.
         * 
         * Variant of the texture for 32-bit based polygon-ids.
         * 
         * @type BindableDataTexture
         */
        this.texturePerEdgeIdPortionIds32Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 8-bit based indices.
         * 
         * @type BindableDataTexture
         */            
        this.texturePerPolygonIdIndices8Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 16-bit based indices.
         * 
         * @type BindableDataTexture
         */            
        this.texturePerPolygonIdIndices16Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 32-bit based indices.
         * 
         * @type BindableDataTexture
         */            
        this.texturePerPolygonIdIndices32Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 8-bit based edge indices.
         * 
         * @type BindableDataTexture
         */            
        this.texturePerPolygonIdEdgeIndices8Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 16-bit based edge indices.
         * 
         * @type BindableDataTexture
         */            
        this.texturePerPolygonIdEdgeIndices16Bits = null;

        /**
         * Texture that holds the unique-vertex-indices for 32-bit based edge indices.
         * 
         * @type BindableDataTexture
         */            
        this.texturePerPolygonIdEdgeIndices32Bits = null;

        /**
         * Texture that holds the camera matrices
         * - columns: each column in the texture is a camera matrix column.
         * - row: each row is a different camera matrix.
         * 
         * @type BindableDataTexture
         */
        this.textureCameraMatrices = null;

        /**
         * Texture that holds the model matrices
         * - columns: each column in the texture is a model matrix column.
         * - row: each row is a different model matrix.
         * 
         * @type BindableDataTexture
         */
        this.textureModelMatrices = null;
    }

    finalize()
    {
        this.indicesPerBitnessTextures = {
            8: this.texturePerPolygonIdIndices8Bits,
            16: this.texturePerPolygonIdIndices16Bits,
            32: this.texturePerPolygonIdIndices32Bits,
        };

        this.indicesPortionIdsPerBitnessTextures = {
            8: this.texturePerPolygonIdPortionIds8Bits,
            16: this.texturePerPolygonIdPortionIds16Bits,
            32: this.texturePerPolygonIdPortionIds32Bits,
        };

        this.edgeIndicesPerBitnessTextures = {
            8: this.texturePerPolygonIdEdgeIndices8Bits,
            16: this.texturePerPolygonIdEdgeIndices16Bits,
            32: this.texturePerPolygonIdEdgeIndices32Bits,
        };

        this.edgeIndicesPortionIdsPerBitnessTextures = {
            8: this.texturePerEdgeIdPortionIds8Bits,
            16: this.texturePerEdgeIdPortionIds16Bits,
            32: this.texturePerEdgeIdPortionIds32Bits,
        };
    }

    /**
     * 
     * @param {Program} glProgram 
     * @param {string} objectMatricesTextureShaderName 
     * @param {string} vertexTextureShaderName 
     * @param {string} objectAttributesTextureShaderName 
     * @param {string} cameraMatricesShaderName 
     * @param {string} modelMatricesShaderName 
     */
    bindCommonTextures (
        glProgram,
        objectMatricesTextureShaderName,
        vertexTextureShaderName,
        objectAttributesTextureShaderName,
        cameraMatricesShaderName,
        modelMatricesShaderName,
        objectOffsetsShaderName
    ) {
        this.texturePerObjectIdPositionsDecodeMatrix.bindTexture (
            glProgram,
            objectMatricesTextureShaderName,
            1 // webgl texture unit
        );

        this.texturePerVertexIdCoordinates.bindTexture (
            glProgram,
            vertexTextureShaderName, 
            2 // webgl texture unit
        );
                
        this.texturePerObjectIdColorsAndFlags.bindTexture (
            glProgram,
            objectAttributesTextureShaderName, 
            3 // webgl texture unit
        );

        this.textureCameraMatrices.bindTexture (
            glProgram,
            cameraMatricesShaderName, 
            4 // webgl texture unit
        );

        this.textureModelMatrices.bindTexture (
            glProgram,
            modelMatricesShaderName, 
            5 // webgl texture unit
        );

        this.texturePerObjectIdOffsets.bindTexture (
            glProgram,
            objectOffsetsShaderName, 
            6 // webgl texture unit
        );
    }

    /**
     * 
     * @param {Program} glProgram 
     * @param {string} portionIdsShaderName 
     * @param {string} polygonIndicesShaderName 
     * @param {8|16|32} textureBitness 
     */
    bindTriangleIndicesTextures (
        glProgram,
        portionIdsShaderName,
        polygonIndicesShaderName,
        textureBitness,
    ) {
        this.indicesPortionIdsPerBitnessTextures[textureBitness].bindTexture (
            glProgram,
            portionIdsShaderName, 
            7 // webgl texture unit
        );    

        this.indicesPerBitnessTextures[textureBitness].bindTexture (
            glProgram,
            polygonIndicesShaderName, 
            8 // webgl texture unit
        );
    }

    /**
     * 
     * @param {Program} glProgram 
     * @param {string} edgePortionIdsShaderName 
     * @param {string} edgeIndicesShaderName 
     * @param {8|16|32} textureBitness 
     */
    bindEdgeIndicesTextures (
        glProgram,
        edgePortionIdsShaderName,
        edgeIndicesShaderName,
        textureBitness,
    ) {
        this.edgeIndicesPortionIdsPerBitnessTextures[textureBitness].bindTexture (
            glProgram,
            edgePortionIdsShaderName, 
            7 // webgl texture unit
        );    

        this.edgeIndicesPerBitnessTextures[textureBitness].bindTexture (
            glProgram,
            edgeIndicesShaderName, 
            8 // webgl texture unit
        );
    }
}

class DataTextureGenerator
{
    /**
     * Enables the currently binded ````WebGLTexture```` to be used as a data texture.
     * 
     * @param {WebGL2RenderingContext} gl
     * 
     * @private
     */
    disableBindedTextureFiltering (gl)
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    /**
     * Generate and return a `camera data texture`.
     * 
     * The texture will automatically update its contents before each render when the camera matrix is dirty,
     * and to do so will use the following events:
     * 
     * - `scene.rendering` event will be used to know that the camera texture should be updated
     * - `camera.matrix` event will be used to know that the camera matices changed
     * 
     * @param {WebGL2RenderingContext} gl 
     * @param {Camera} camera 
     * @param {Scene} scene 
     * @param {null|number[3]} origin 
     * 
     * @returns {BindableDataTexture}
     */
    generateCameraDataTexture (gl, camera, scene, origin)
    {
        const textureWidth = 4;
        const textureHeight = 3; // space for 3 matrices

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);
        
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture (gl.TEXTURE_2D, null);

        const cameraTexture = new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );

        let cameraDirty = true;

        const onCameraMatrix = () => {
            if (!cameraDirty) {
                return;
            }

            cameraDirty = false;
            
            gl.bindTexture (gl.TEXTURE_2D, cameraTexture._texture);

            // Camera's "view matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                0, // 1st matrix: camera view matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array ((origin) ? createRTCViewMat(camera.viewMatrix, origin) : camera.viewMatrix)
            );

            // Camera's "view normal matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                1, // 2nd matrix: camera view normal matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array (camera.viewNormalMatrix)
            );

            // Camera's "project matrix"
            gl.texSubImage2D(
                gl.TEXTURE_2D,
                0,
                0,
                2, // 3rd matrix: camera project matrix
                4,
                1,
                gl.RGBA,
                gl.FLOAT,
                new Float32Array (camera.project.matrix)
            );
        };

        camera.on ("matrix", () => cameraDirty = true);

        scene.on ("rendering", onCameraMatrix);

        onCameraMatrix ();

        return cameraTexture;
    }

    /**
     * Generate and return a `model data texture`.
     *
     * @param {WebGL2RenderingContext} gl 
     * @param {PerformanceModel} model 
     * 
     * @returns {BindableDataTexture}
    */
    generatePeformanceModelDataTexture (gl, model)
    {
        const textureWidth = 4;
        const textureHeight = 2; // space for 2 matrices

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);
        
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, // x-offset
            0, // y-offset (model world matrix)
            4, // data width (4x4 values)
            1, // data height (1 matrix)
            gl.RGBA,
            gl.FLOAT,
            new Float32Array (model.worldMatrix)
        );
        
        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0, // x-offset
            1, // y-offset (model normal matrix)
            4, // data width (4x4 values)
            1, // data height (1 matrix)
            gl.RGBA,
            gl.FLOAT,
            new Float32Array (model.worldNormalMatrix)
        );

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture (gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * This will generate an RGBA texture for:
     * - colors
     * - pickColors
     * - flags
     * - flags2
     * - vertex bases
     * - vertex base offsets
     * 
     * The texture will have:
     * - 4 RGBA columns per row: for each object (pick) color and flags(2)
     * - N rows where N is the number of objects
     * 
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<ArrayLike<int>>} colors Array of colors for all objects in the layer
     * @param {ArrayLike<ArrayLike<int>>} pickColors Array of pickColors for all objects in the layer
     * @param {ArrayLike<int>} vertexBases Array of position-index-bases foteh all objects in the layer
     * @param {ArrayLike<int>} indexBaseOffsets For triangles: array of offests between the (gl_VertexID / 3) and the position where the indices start in the texture layer
     * @param {ArrayLike<int>} edgeIndexBaseOffsets For edges: Array of offests between the (gl_VertexID / 2) and the position where the edge indices start in the texture layer
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureForColorsAndFlags (gl, colors, pickColors, vertexBases, indexBaseOffsets, edgeIndexBaseOffsets) {
        // The number of rows in the texture is the number of
        // objects in the layer.

        const textureHeight = colors.length;

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        // 4 columns per texture row:
        // - col0: (RGBA) object color RGBA
        // - col1: (packed Uint32 as RGBA) object pick color
        // - col2: (packed 4 bytes as RGBA) object flags
        // - col3: (packed 4 bytes as RGBA) object flags2
        // - col4: (packed Uint32 bytes as RGBA) vertex base
        // - col5: (packed Uint32 bytes as RGBA) index base offset
        // - col6: (packed Uint32 bytes as RGBA) edge index base offset
        const textureWidth = 7;

        const texArray = new Uint8Array (4 * textureWidth * textureHeight);

        dataTextureRamStats.sizeDataColorsAndFlags +=texArray.byteLength;

        for (var i = 0; i < textureHeight; i++)
        {
            // object color
            texArray.set (
                colors [i],
                i * 28 + 0
            );

            // object pick color
            texArray.set (
                pickColors [i],
                i * 28 + 4
            );

            // object flags
            texArray.set (
                [
                    0, 0, 0, 0
                ],
                i * 28 + 8
            );

            // object flags2
            texArray.set (
                [
                    0, 0, 0, 0
                ],
                i * 28 + 12
            );

            // vertex base
            texArray.set (
                [
                    (vertexBases[i] >> 24) & 255,
                    (vertexBases[i] >> 16) & 255,
                    (vertexBases[i] >> 8) & 255,
                    (vertexBases[i]) & 255,
                ],
                i * 28 + 16
            );

            // triangles index base offset
            texArray.set (
                [
                    (indexBaseOffsets[i] >> 24) & 255,
                    (indexBaseOffsets[i] >> 16) & 255,
                    (indexBaseOffsets[i] >> 8) & 255,
                    (indexBaseOffsets[i]) & 255,
                ],
                i * 28 + 20
            );

            // edge index base offset
            texArray.set (
                [
                    (edgeIndexBaseOffsets[i] >> 24) & 255,
                    (edgeIndexBaseOffsets[i] >> 16) & 255,
                    (edgeIndexBaseOffsets[i] >> 8) & 255,
                    (edgeIndexBaseOffsets[i]) & 255,
                ],
                i * 28 + 24
            );
        }

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RGBA_INTEGER,
            gl.UNSIGNED_BYTE,
            texArray,
            0
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight,
            texArray
        );
    }

    /**
     * This will generate a texture for all object offsets.
     * 
     * @param {WebGL2RenderingContext} gl
     * @param {int[]} offsets Array of int[3], one XYZ offset array for each object
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureForObjectOffsets (gl, offsets) {
        const textureHeight =  offsets.length;

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const textureWidth = 1;

        var texArray = new Float32Array(3 * textureWidth * textureHeight);

        dataTextureRamStats.sizeDataTextureOffsets += texArray.byteLength;

        for (var i = 0; i < offsets.length; i++)
        {
            // object offset
            texArray.set (
                offsets [i],
                i * 3
            );
        }

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);
        
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32F, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RGB,
            gl.FLOAT,
            texArray,
            0
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight,
            texArray
        );
    }
    /**
     * This will generate a texture for all positions decode matrices in the layer.
     * 
     * The texture will have:
     * - 4 RGBA columns per row (each column will contain 4 packed half-float (16 bits) components).
     *   Thus, each row will contain 16 packed half-floats corresponding to a complete positions decode matrix)
     * - N rows where N is the number of objects
     * 
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<Matrix4x4>} positionDecodeMatrices Array of positions decode matrices for all objects in the layer
     * @param {ArrayLike<Matrix4x4>} instanceMatrices Array of geometry instancing matrices for all objects in the layer. Null if the objects are not instanced.
     * @param {ArrayLike<Matrix4x4>} instancesNormalMatrices Array of normals instancing matrices for all objects in the layer. Null if the objects are not instanced.
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureForPositionsDecodeMatrices (gl, positionDecodeMatrices, instanceMatrices, instancesNormalMatrices) {
        const textureHeight =  positionDecodeMatrices.length;

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        // 3 matrices per row
        const textureWidth = 4 * 3;

        var texArray = new Float32Array(4 * textureWidth * textureHeight);

        dataTextureRamStats.sizeDataPositionDecodeMatrices +=texArray.byteLength;

        for (var i = 0; i < positionDecodeMatrices.length; i++)
        {
            // 4x4 values
            texArray.set (
                positionDecodeMatrices [i],
                i * 48
            );

            // 4x4 values
            texArray.set (
                instanceMatrices [i],
                i * 48 + 16
            );
            
            // 4x4 values
            texArray.set (
                instancesNormalMatrices [i],
                i * 48 + 32
            );
        }

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);
        
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RGBA,
            gl.FLOAT,
            texArray,
            0
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} indices
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureFor8BitIndices (gl, indices) {
        if (indices.length == 0) {
            return {
                texture: null,
                textureHeight: 0,
            };
        }

        const textureWidth = 1024;
        const textureHeight = Math.ceil (indices.length / 3 / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint8Array (texArraySize);

        dataTextureRamStats.sizeDataTextureIndices +=texArray.byteLength;

        texArray.fill(0);
        texArray.set(indices, 0)

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB8UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RGB_INTEGER,
            gl.UNSIGNED_BYTE,
            texArray,
            0
        );

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} indices
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureFor16BitIndices (gl, indices) {
        if (indices.length == 0) {
            return {
                texture: null,
                textureHeight: 0,
            };
        }
        const textureWidth = 1024;
        const textureHeight = Math.ceil (indices.length / 3 / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint16Array (texArraySize);

        dataTextureRamStats.sizeDataTextureIndices +=texArray.byteLength;

        texArray.fill(0);
        texArray.set(indices, 0)

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RGB_INTEGER,
            gl.UNSIGNED_SHORT,
            texArray,
            0
        );

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} indices
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureFor32BitIndices (gl, indices) {
        if (indices.length == 0) {
            return {
                texture: null,
                textureHeight: 0,
            };
        }

        const textureWidth = 1024;
        const textureHeight = Math.ceil (indices.length / 3 / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint32Array (texArraySize);

        dataTextureRamStats.sizeDataTextureIndices +=texArray.byteLength;

        texArray.fill(0);
        texArray.set(indices, 0)

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RGB_INTEGER,
            gl.UNSIGNED_INT,
            texArray,
            0
        );

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} edgeIndices
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureFor8BitsEdgeIndices (gl, edgeIndices) {
        if (edgeIndices.length == 0) {
            return {
                texture: null,
                textureHeight: 0,
            };
        }

        const textureWidth = 1024;
        const textureHeight = Math.ceil (edgeIndices.length / 2 / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint8Array (texArraySize);

        dataTextureRamStats.sizeDataTextureEdgeIndices +=texArray.byteLength;

        texArray.fill(0);
        texArray.set(edgeIndices, 0)

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG8UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RG_INTEGER,
            gl.UNSIGNED_BYTE,
            texArray,
            0
        );

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} edgeIndices
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureFor16BitsEdgeIndices (gl, edgeIndices) {
        if (edgeIndices.length == 0) {
            return {
                texture: null,
                textureHeight: 0,
            };
        }

        const textureWidth = 1024;
        const textureHeight = Math.ceil (edgeIndices.length / 2 / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint16Array (texArraySize);

        dataTextureRamStats.sizeDataTextureEdgeIndices +=texArray.byteLength;

        texArray.fill(0);
        texArray.set(edgeIndices, 0)

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG16UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RG_INTEGER,
            gl.UNSIGNED_SHORT,
            texArray,
            0
        );

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} edgeIndices
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureFor32BitsEdgeIndices (gl, edgeIndices) {
        if (edgeIndices.length == 0) {
            return {
                texture: null,
                textureHeight: 0,
            };
        }

        const textureWidth = 1024;
        const textureHeight = Math.ceil (edgeIndices.length / 2 / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight * 2;
        const texArray = new Uint32Array (texArraySize);

        dataTextureRamStats.sizeDataTextureEdgeIndices +=texArray.byteLength;

        texArray.fill(0);
        texArray.set(edgeIndices, 0)

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RG_INTEGER,
            gl.UNSIGNED_INT,
            texArray,
            0
        );

        this.disableBindedTextureFiltering (gl);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} positions Array of (uniquified) quantized positions in the layer
     * 
     * This will generate a texture for positions in the layer.
     * 
     * The texture will have:
     * - 1024 columns, where each pixel will be a 16-bit-per-component RGB texture, corresponding to the XYZ of the position 
     * - a number of rows R where R*1024 is just >= than the number of vertices (positions / 3)
     * 
     * @returns {BindableDataTexture}
     */
    generateTextureForPositions (gl, positions) {
        const numVertices = positions.length / 3;
        const textureWidth = 1024;
        const textureHeight =  Math.ceil (numVertices / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight * 3;
        const texArray = new Uint16Array (texArraySize);

        dataTextureRamStats.sizeDataTexturePositions +=texArray.byteLength;

        texArray.fill(0);

        texArray.set (positions, 0);

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB16UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RGB_INTEGER,
            gl.UNSIGNED_SHORT,
            texArray,
            0
        );

        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }

    /**
     * @param {WebGL2RenderingContext} gl
     * @param {ArrayLike<int>} portionIdsArray
     * 
     * @returns {BindableDataTexture}
    */
    generateTextureForPackedPortionIds (gl, portionIdsArray) {
        if (portionIdsArray.length == 0) {
            return {
                texture: null,
                textureHeight: 0,
            };
        }
        const lenArray = portionIdsArray.length;
        const textureWidth = 1024;
        const textureHeight = Math.ceil (lenArray / textureWidth);

        if (textureHeight == 0)
        {
            throw "texture height == 0";
        }

        const texArraySize = textureWidth * textureHeight;
        const texArray = new Uint16Array (texArraySize);

        texArray.set (
            portionIdsArray,
            0
        );

        dataTextureRamStats.sizeDataTexturePortionIds += texArray.byteLength;

        const texture = gl.createTexture();

        gl.bindTexture (gl.TEXTURE_2D, texture);

        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R16UI, textureWidth, textureHeight);

        gl.texSubImage2D(
            gl.TEXTURE_2D,
            0,
            0,
            0,
            textureWidth,
            textureHeight,
            gl.RED_INTEGER,
            gl.UNSIGNED_SHORT,
            texArray,
            0
        );

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);

        gl.bindTexture(gl.TEXTURE_2D, null);

        return new BindableDataTexture(
            gl,
            texture,
            textureWidth,
            textureHeight
        );
    }
}

export {
    dataTextureRamStats,
    DataTextureState,
    DataTextureBuffer,
    DataTextureGenerator,
}