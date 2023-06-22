declare const stats: {
    build: {
        version: string;
    };
    client: {
        browser: string;
    };

    components: {
        scenes: number;
        models: number;
        meshes: number;
        objects: number;
    };
    memory: {
        meshes: number;
        positions: number;
        colors: number;
        normals: number;
        uvs: number;
        indices: number;
        textures: number;
        transforms: number;
        materials: number;
        programs: number;
    };
    frame: {
        frameCount: number;
        fps: number;
        useProgram: number;
        bindTexture: number;
        bindArray: number;
        drawElements: number;
        drawArrays: number;
        tasksRun: number;
        tasksScheduled: number;
    };
};

export { stats };
