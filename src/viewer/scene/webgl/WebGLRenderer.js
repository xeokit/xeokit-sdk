export const makeInputSetters = function(gl, handle, assignTextureUnitsAutomatically) {
    const activeInputs = { };

    const numAttributes = gl.getProgramParameter(handle, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < numAttributes; ++i) {
        const attribute = gl.getActiveAttrib(handle, i);
        const location = gl.getAttribLocation(handle, attribute.name);
        activeInputs[attribute.name] = function(arrayBuf, divisor) {
            arrayBuf.bindAtLocation(location);
            gl.enableVertexAttribArray(location);
            if (divisor) {
                gl.vertexAttribDivisor(location, divisor);
            }
        };
        activeInputs[attribute.name].attributeHash = `${attribute.name}:${location}`;
    }

    const numBlocks = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORM_BLOCKS);
    for (let i = 0; i < numBlocks; ++i) {
        const blockName = gl.getActiveUniformBlockName(handle, i);
        const uniformBlockIndex = gl.getUniformBlockIndex(handle, blockName);
        const uniformBlockBinding = i;
        gl.uniformBlockBinding(handle, uniformBlockIndex, uniformBlockBinding);
        const buffer = gl.createBuffer();
        activeInputs[blockName] = function(data) {
            gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
            gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);
            gl.bindBufferBase(gl.UNIFORM_BUFFER, uniformBlockBinding, buffer);
        };
    }

    const numUniforms = gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS);
    let nextUnit = 0;
    for (let i = 0; i < numUniforms; ++i) {
        const u = gl.getActiveUniform(handle, i);
        let uName = u.name;
        if (uName[uName.length - 1] === "\u0000") {
            uName = uName.substr(0, uName.length - 1);
        }
        const location = gl.getUniformLocation(handle, uName);
        const type = (function() {
            for (let k in gl) {
                if (u.type === gl[k])
                    return k;
            }
            return null;
        })();

        if ((u.type === gl.SAMPLER_2D)
            ||
            (u.type === gl.SAMPLER_CUBE)
            ||
            (u.type === gl.SAMPLER_2D_SHADOW)
            ||
            ((gl instanceof window.WebGL2RenderingContext)
             &&
             ((u.type === gl.UNSIGNED_INT_SAMPLER_2D)
              ||
              (u.type === gl.INT_SAMPLER_2D)))) {
            if (assignTextureUnitsAutomatically) {
                const unit = nextUnit++;
                activeInputs[uName] = function(texture) {
                    const bound = texture.bind(unit);
                    if (bound) {
                        gl.uniform1i(location, unit);
                    }
                    return bound;
                };
            } else {
                activeInputs[uName] = function(texture, unit) {
                    const bound = texture.bind(unit);
                    if (bound) {
                        gl.uniform1i(location, unit);
                    }
                    return bound;
                };
            }
        } else {
            activeInputs[uName] = (function() {
                if (u.size === 1) {
                    switch (u.type) {
                    case gl.BOOL:       return value => gl.uniform1i(location, value);
                    case gl.INT:        return value => gl.uniform1i(location, value);
                    case gl.FLOAT:      return value => gl.uniform1f(location, value);
                    case gl.FLOAT_VEC2: return value => gl.uniform2fv(location, value);
                    case gl.FLOAT_VEC3: return value => gl.uniform3fv(location, value);
                    case gl.FLOAT_VEC4: return value => gl.uniform4fv(location, value);
                    case gl.FLOAT_MAT3: return value => gl.uniformMatrix3fv(location, false, value);
                    case gl.FLOAT_MAT4: return value => gl.uniformMatrix4fv(location, false, value);
                    }
                }
                throw `Unhandled uniform ${uName}`;
            })();
        }
    }

    return function(name) {
        const u = activeInputs[name];
        if (! u) {
            throw `Missing input "${name}"`;
        }
        return u;
    };
};
