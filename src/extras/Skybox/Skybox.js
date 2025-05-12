import {
    ClampToEdgeWrapping,
    LinearEncoding,
    Mesh,
    PhongMaterial,
    ReadableGeometry,
    Texture
} from "../../viewer/index.js";

/**
 * @param {Component} scene 
 * @param {*} [cfg]  Skybox configuration
 * @param {String} [cfg.id] Optional ID, unique among all components in the parent {Scene}, generated automatically when omitted.
 * @param {String | String[]} [cfg.src=null] Path to skybox texture
 * @param {Number} [cfg.encoding=LinearEncoding] Texture encoding format.  See the {@link Texture#encoding} property for more info.
 * @param {Number} [cfg.size=1000] Size of this Skybox, given as the distance from the center at ````[0,0,0]```` to each face.
 */

export async function createSkybox(scene, cfg = {}) {
    const useMultipleTexture = typeof cfg.src === "object" && cfg.src !== null;

    if (useMultipleTexture) {
        try {
            const combinedTexture = await createCombinedTexture(scene, cfg);
            return createSkyboxMesh(scene, cfg, combinedTexture);
        } catch (e) {
            console.error('error at creating skybox: ', e);
            return null;
        }

    } else {
        return createSkyboxMesh(scene, cfg);
    }
}

async function createCombinedTexture(scene, cfg) {
    const [
        posX,
        negX,
        posY,
        negY,
        posZ,
        negZ
    ] = cfg.src;

    if (!posX || !negX || !posY || !negY || !posZ || !negZ) {
        throw new Error("All six skybox textures must be provided");
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const loadImage = src => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            img.src = src;
        });
    };

    try {
        const [imgPosX, imgNegX, imgPosY, imgNegY, imgPosZ, imgNegZ] = await Promise.all([
            loadImage(posX),
            loadImage(negX),
            loadImage(posY),
            loadImage(negY),
            loadImage(posZ),
            loadImage(negZ)
        ]);

        const imageSize = imgPosX.width;
        if (
            imgNegX.width !== imageSize || imgPosY.width !== imageSize ||
            imgNegY.width !== imageSize || imgPosZ.width !== imageSize ||
            imgNegZ.width !== imageSize
        ) {
            throw new Error("All skybox textures must have the same dimensions");
        }

        // Set canvas size for the Christ cross layout (3×4 grid)
        canvas.width = imageSize * 4;
        canvas.height = imageSize * 3;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(imgNegX, imageSize * 0, imageSize * 1, imageSize, imageSize);  // -X (left)
        ctx.drawImage(imgPosX, imageSize * 2, imageSize * 1, imageSize, imageSize);  // +X (right)
        ctx.drawImage(imgPosY, imageSize * 1, imageSize * 0, imageSize, imageSize);  // +Y (top)
        ctx.drawImage(imgNegY, imageSize * 1, imageSize * 2, imageSize, imageSize);  // -Y (bottom)
        ctx.drawImage(imgPosZ, imageSize * 1, imageSize * 1, imageSize, imageSize);  // +Z (front)
        ctx.drawImage(imgNegZ, imageSize * 3, imageSize * 1, imageSize, imageSize);  // -Z (back)

        const combinedTexture = new Texture(scene, {
            image: canvas,
            flipY: true,
            wrapS: ClampToEdgeWrapping,
            wrapT: ClampToEdgeWrapping,
            encoding: cfg.encoding || LinearEncoding
        });

        return combinedTexture;
    } catch (error) {
        console.error("Error creating combined skybox texture:", error);
        throw error;
    }
}

function createSkyboxMesh(scene, cfg, combinedTexture = null) {
    const texture = combinedTexture || new Texture(scene, {
        src: cfg.src,
        flipY: true,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
        encoding: cfg.encoding || LinearEncoding
    });

    return new Mesh(scene, {

        geometry: new ReadableGeometry(scene, { // Box-shaped geometry
            primitive: "triangles",
            positions: [
                1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, // v0-v1-v2-v3 front
                1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, // v0-v3-v4-v5 right
                1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, 1, // v0-v5-v6-v1 top
                -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, // v1-v6-v7-v2 left
                -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, // v7-v4-v3-v2 bottom
                1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1 // v4-v7-v6-v5 back
            ],
            uv: [
                0.5, 0.6666, 0.25, 0.6666, 0.25, 0.3333, 0.5, 0.3333, 0.5, 0.6666, 0.5, 0.3333, 0.75, 0.3333, 0.75, 0.6666,
                0.5, 0.6666, 0.5, 1, 0.25, 1, 0.25, 0.6666, 0.25, 0.6666, 0.0, 0.6666, 0.0, 0.3333, 0.25, 0.3333,
                0.25, 0, 0.50, 0, 0.50, 0.3333, 0.25, 0.3333, 0.75, 0.3333, 1.0, 0.3333, 1.0, 0.6666, 0.75, 0.6666
            ],
            indices: [
                0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11,
                12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23
            ]
        }),
        background: true,
        scale: [cfg.size, cfg.size, cfg.size],
        rotation: [0, -90, 0],
        material: new PhongMaterial(scene, {
            ambient: [0, 0, 0],
            diffuse: [0, 0, 0],
            specular: [0, 0, 0],
            emissive: [1, 1, 1],
            emissiveMap: texture,
            backfaces: true // Show interior faces of our skybox geometry
        }),
        visible: true,
        pickable: false,
        clippable: false,
        collidable: false
    });
}