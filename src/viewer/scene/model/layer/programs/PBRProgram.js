import {WEBGL_INFO} from "../../../webglInfo.js";

export const PBRProgram = function(scene, lightSetup, sao) {
    const gl = scene.canvas.gl;
    const getIrradiance = lightSetup.getIrradiance;
    const getReflectionRadiance = lightSetup.getReflectionRadiance;
    const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.
    return {
        programName: "PBR",
        getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao", gammaOutput],
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,      // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendVertexDefinitions: (src) => {
            src.push("uniform mat3 uvDecodeMatrix;");
            src.push("out vec4 vViewPosition;");
            src.push("out vec3 vViewNormal;");
            src.push("out vec4 vColor;");
            src.push("out vec2 vUV;");
            src.push("out vec2 vMetallicRoughness;");

            if (getIrradiance) {
                src.push("out vec3 vWorldNormal;");
            }
        },
        appendVertexOutputs: (src, color, pickColor, uv, metallicRoughness, gl_Position, view, worldNormal, worldPosition) => {
            src.push(`vViewPosition = ${view.viewPosition};`);
            src.push(`vViewNormal = ${view.viewNormal};`);
            src.push(`vColor = ${color};`);
            src.push(`vUV = (uvDecodeMatrix * vec3(${uv}, 1.0)).xy;`);
            src.push(`vMetallicRoughness = ${metallicRoughness};`);

            if (getIrradiance) {
                src.push(`vWorldNormal = ${worldNormal}.xyz;`);
            }
        },
        appendFragmentDefinitions: (src) => {
            src.push("uniform sampler2D uColorMap;");
            src.push("uniform sampler2D uMetallicRoughMap;");
            src.push("uniform sampler2D uEmissiveMap;");
            src.push("uniform sampler2D uNormalMap;");
            src.push("uniform sampler2D uAOMap;");
            src.push("in vec4 vViewPosition;");
            src.push("in vec3 vViewNormal;");
            src.push("in vec4 vColor;");
            src.push("in vec2 vUV;");
            src.push("in vec2 vMetallicRoughness;");

            if (getIrradiance) {
                src.push("in vec3 vWorldNormal;");
            }

            lightSetup.appendDefinitions(src);
            sao && sao.appendDefinitions(src);

            src.push("vec4 sRGBToLinearPBR( in vec4 value ) {"); // temporary "PBR" postfix while sRGBToLinear is defined for lights
            src.push("  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );");
            src.push("}");
            if (gammaOutput) {
                src.push("uniform float gammaFactor;");
                src.push("vec4 linearToGamma( in vec4 value ) {");
                src.push("  return vec4( pow( value.xyz, vec3( 1.0 / gammaFactor ) ), value.w );");
                src.push("}");
            }

            // CONSTANT DEFINITIONS

            src.push("#define PI 3.14159265359");
            src.push("#define RECIPROCAL_PI 0.31830988618");
            src.push("#define RECIPROCAL_PI2 0.15915494");
            src.push("#define EPSILON 1e-6");

            src.push("#define saturate(a) clamp( a, 0.0, 1.0 )");

            // UTILITY DEFINITIONS

            src.push("vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {");
            src.push("       vec3 texel = texture( uNormalMap, uv ).xyz;");
            src.push("       if (texel.r == 0.0 && texel.g == 0.0 && texel.b == 0.0) {");
            src.push("              return surf_norm;");
            src.push("       }");
            src.push("      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );");
            src.push("      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );");
            src.push("      vec2 st0 = dFdx( uv.st );");
            src.push("      vec2 st1 = dFdy( uv.st );");
            src.push("      vec3 S = normalize( q0 * st1.t - q1 * st0.t );");
            src.push("      vec3 T = normalize( -q0 * st1.s + q1 * st0.s );");
            src.push("      vec3 N = normalize( surf_norm );");
            src.push("      vec3 mapN = texel.xyz * 2.0 - 1.0;");
            src.push("      mat3 tsn = mat3( S, T, N );");
            // src.push("      mapN *= 3.0;");
            src.push("      return normalize( tsn * mapN );");
            src.push("}");

            src.push("vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {");
            src.push("   return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );");
            src.push("}");

            // STRUCTURES

            src.push("struct IncidentLight {");
            src.push("   vec3 color;");
            src.push("   vec3 direction;");
            src.push("};");

            src.push("struct ReflectedLight {");
            src.push("   vec3 diffuse;");
            src.push("   vec3 specular;");
            src.push("};");

            src.push("struct Geometry {");
            src.push("   vec3 position;");
            src.push("   vec3 viewNormal;");
            src.push("   vec3 viewEyeDir;");
            src.push("};");

            src.push("struct Material {");
            src.push("   vec3  diffuseColor;");
            src.push("   float specularRoughness;");
            src.push("   vec3  specularColor;");
            src.push("   float shine;"); // Only used for Phong
            src.push("};");

            // SPECULAR BRDF EVALUATION

            src.push("vec3 F_Schlick(const in vec3 specularColor, const in float dotLH) {");
            src.push("   float fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );");
            src.push("   return ( 1.0 - specularColor ) * fresnel + specularColor;");
            src.push("}");

            src.push("float G_GGX_Smith(const in float alpha, const in float dotNL, const in float dotNV) {");
            src.push("   float a2 = ( alpha * alpha );");
            src.push("   float gl = dotNL + sqrt( a2 + ( 1.0 - a2 ) * ( dotNL * dotNL ) );");
            src.push("   float gv = dotNV + sqrt( a2 + ( 1.0 - a2 ) * ( dotNV * dotNV ) );");
            src.push("   return 1.0 / ( gl * gv );");
            src.push("}");

            src.push("float G_GGX_SmithCorrelated(const in float alpha, const in float dotNL, const in float dotNV) {");
            src.push("   float a2 = ( alpha * alpha );");
            src.push("   float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * ( dotNV * dotNV ) );");
            src.push("   float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * ( dotNL * dotNL ) );");
            src.push("   return 0.5 / max( gv + gl, EPSILON );");
            src.push("}");

            src.push("float D_GGX(const in float alpha, const in float dotNH) {");
            src.push("   float a2 = ( alpha * alpha );");
            src.push("   float denom = ( dotNH * dotNH) * ( a2 - 1.0 ) + 1.0;");
            src.push("   return RECIPROCAL_PI * a2 / ( denom * denom);");
            src.push("}");

            src.push("vec3 BRDF_Specular_GGX(const in IncidentLight incidentLight, const in Geometry geometry, const in vec3 specularColor, const in float roughness) {");
            src.push("   float alpha = ( roughness * roughness );");
            src.push("   vec3 halfDir = normalize( incidentLight.direction + geometry.viewEyeDir );");
            src.push("   float dotNL = saturate( dot( geometry.viewNormal, incidentLight.direction ) );");
            src.push("   float dotNV = saturate( dot( geometry.viewNormal, geometry.viewEyeDir ) );");
            src.push("   float dotNH = saturate( dot( geometry.viewNormal, halfDir ) );");
            src.push("   float dotLH = saturate( dot( incidentLight.direction, halfDir ) );");
            src.push("   vec3  F = F_Schlick( specularColor, dotLH );");
            src.push("   float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );");
            src.push("   float D = D_GGX( alpha, dotNH );");
            src.push("   return F * (G * D);");
            src.push("}");

            src.push("vec3 BRDF_Specular_GGX_Environment(const in Geometry geometry, const in vec3 specularColor, const in float roughness) {");
            src.push("   float dotNV = saturate(dot(geometry.viewNormal, geometry.viewEyeDir));");
            src.push("   const vec4 c0 = vec4( -1, -0.0275, -0.572,  0.022);");
            src.push("   const vec4 c1 = vec4(  1,  0.0425,   1.04, -0.04);");
            src.push("   vec4 r = roughness * c0 + c1;");
            src.push("   float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;");
            src.push("   vec2 AB    = vec2(-1.04, 1.04) * a004 + r.zw;");
            src.push("   return specularColor * AB.x + AB.y;");
            src.push("}");

            // MAIN LIGHTING COMPUTATION FUNCTION

            src.push("void computePBRLighting(const in IncidentLight incidentLight, const in Geometry geometry, const in Material material, inout ReflectedLight reflectedLight) {");
            src.push("   float dotNL     = saturate(dot(geometry.viewNormal, incidentLight.direction));");
            src.push("   vec3 irradiance = dotNL * incidentLight.color * PI;");
            src.push("   reflectedLight.diffuse  += irradiance * (RECIPROCAL_PI * material.diffuseColor);");
            src.push("   reflectedLight.specular += irradiance * BRDF_Specular_GGX(incidentLight, geometry, material.specularColor, material.specularRoughness);");
            src.push("}");

            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr, viewMatrix) => {
            src.push("IncidentLight  light;");
            src.push("Material       material;");
            src.push("Geometry       geometry;");
            src.push("ReflectedLight reflectedLight = ReflectedLight(vec3(0.0,0.0,0.0), vec3(0.0,0.0,0.0));");

            src.push("vec3 rgb = (vec3(float(vColor.r) / 255.0, float(vColor.g) / 255.0, float(vColor.b) / 255.0));");
            src.push("float opacity = float(vColor.a) / 255.0;");

            src.push("vec3  baseColor = rgb;");
            src.push("float specularF0 = 1.0;");
            src.push("float metallic = float(vMetallicRoughness.r) / 255.0;");
            src.push("float roughness = float(vMetallicRoughness.g) / 255.0;");
            src.push("float dielectricSpecular = 0.16 * specularF0 * specularF0;");

            src.push("vec4 colorTexel = sRGBToLinearPBR(texture(uColorMap, vUV));");
            src.push("baseColor *= colorTexel.rgb;");
            // src.push("opacity *=/= colorTexel.a;"); // batching had "*=", instancing had "="

            src.push("vec3 metalRoughTexel = texture(uMetallicRoughMap, vUV).rgb;");
            src.push("metallic *= metalRoughTexel.b;");
            src.push("roughness *= metalRoughTexel.g;");

            src.push("vec3 viewNormal = perturbNormal2Arb( vViewPosition.xyz, normalize(vViewNormal), vUV );");

            src.push("material.diffuseColor      = baseColor * (1.0 - dielectricSpecular) * (1.0 - metallic);");
            src.push("material.specularRoughness = clamp(roughness, 0.04, 1.0);");
            src.push("material.specularColor     = mix(vec3(dielectricSpecular), baseColor, metallic);");

            src.push("geometry.position      = vViewPosition.xyz;");
            src.push("geometry.viewNormal    = -normalize(viewNormal);");
            src.push("geometry.viewEyeDir    = normalize(vViewPosition.xyz);");

            if (getIrradiance) {
                src.push(`reflectedLight.diffuse += ${getIrradiance("normalize(vWorldNormal)")} * material.diffuseColor;`);
            }

            if (getReflectionRadiance) {
                const reflectVec = `inverseTransformDirection(reflect(geometry.viewEyeDir, geometry.viewNormal), ${viewMatrix})`;
                const radiance = getReflectionRadiance("material.specularRoughness", reflectVec);
                const specularBRDFContrib = "BRDF_Specular_GGX_Environment(geometry, material.specularColor, material.specularRoughness)";
                src.push(`reflectedLight.specular += ${radiance} * ${specularBRDFContrib};`);
            }

            lightSetup.getDirectionalLights(viewMatrix, "vViewPosition").forEach(light => {
                src.push(`light.direction = ${light.direction};`);
                src.push(`light.color = ${light.color};`);
                src.push("computePBRLighting(light, geometry, material, reflectedLight);");
            });

            src.push("vec3 emissiveColor = sRGBToLinearPBR(texture(uEmissiveMap, vUV)).rgb;"); // TODO: correct gamma function
            src.push("float aoFactor = texture(uAOMap, vUV).r;");

            src.push("vec3 outgoingLight = (" + lightSetup.getAmbientColor() + " * baseColor * opacity * rgb) + (reflectedLight.diffuse) + (reflectedLight.specular) + emissiveColor;");

            src.push("outColor = vec4(outgoingLight * aoFactor" + (sao ? ` * ${sao.getAmbient(gl_FragCoord)}` : "") + ", opacity);");

            if (gammaOutput) {
                src.push("outColor = linearToGamma(outColor);");
            }
        },
        setupInputs: (program) => {
            const uUVDecodeMatrix      = program.getLocation("uvDecodeMatrix");

            const uColorMap            = program.getSampler("uColorMap");
            const uMetallicRoughMap    = program.getSampler("uMetallicRoughMap");
            const uEmissiveMap         = program.getSampler("uEmissiveMap");
            const uNormalMap           = program.getSampler("uNormalMap");
            const uAOMap               = program.getSampler("uAOMap");

            const uGammaFactor         = gammaOutput && program.getLocation("gammaFactor");
            const setLightsRenderState = lightSetup.setupInputs(program);
            const setSAOState          = sao && sao.setupInputs(program);

            return (frameCtx, layer, rtcOrigin) => {
                const state = layer._state;
                gl.uniformMatrix3fv(uUVDecodeMatrix, false, state.uvDecodeMatrix);

                const textureSet = state.textureSet;
                if (textureSet) {
                    const setSampler = (sampler, texture) => {
                        if (texture) {
                            sampler.bindTexture(texture.texture, frameCtx.textureUnit);
                            frameCtx.textureUnit = (frameCtx.textureUnit + 1) % WEBGL_INFO.MAX_TEXTURE_IMAGE_UNITS;
                        }
                    };

                    setSampler(uColorMap,         textureSet.colorTexture);
                    setSampler(uMetallicRoughMap, textureSet.metallicRoughnessTexture);
                    setSampler(uEmissiveMap,      textureSet.emissiveTexture);
                    setSampler(uNormalMap,        textureSet.normalsTexture);
                    setSampler(uAOMap,  textureSet.occlusionTexture);
                }

                uGammaFactor && gl.uniform1f(uGammaFactor, scene.gammaFactor);
                setLightsRenderState(frameCtx);
                setSAOState && setSAOState(frameCtx);
            };
        },

        clippingCaps: scene._sectionPlanesState.clippingCaps && "outColor",
        incrementDrawState: true
    };
};
