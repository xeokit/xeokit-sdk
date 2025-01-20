import {createLightSetup, setupTexture} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tempVec4 = math.vec4();

export const DrawShaderSource = function(mesh) {
    const scene = mesh.scene;
    const material = mesh._material;
    const meshState = mesh._state;
    const geometryState = mesh._geometry._state;
    const primitive = geometryState.primitiveName;
    const normals = (geometryState.autoVertexNormals || geometryState.normalsBuf) && (primitive === "triangles" || primitive === "triangle-strip" || primitive === "triangle-fan");
    const background = meshState.background;
    const materialState = material._state;
    const uvs = geometryState.uvBuf;
    const phongMaterial    = (materialState.type === "PhongMaterial");
    const metallicMaterial = (materialState.type === "MetallicMaterial");
    const specularMaterial = (materialState.type === "SpecularMaterial");

    const lightSetup = normals && createLightSetup(scene._lightsState, !!uvs);
    const hasNonAmbientLighting = (lightSetup.directionalLights.length > 0) || lightSetup.lightMap || lightSetup.reflectionMap;

    const setupFresnel = (name, colorSwizzle, getMaterialValue) => {
        const edgeBias    = name + "FresnelEdgeBias";
        const centerBias  = name + "FresnelCenterBias";
        const power       = name + "FresnelPower";
        const edgeColor   = name + "FresnelEdgeColor";
        const centerColor = name + "FresnelCenterColor";

        return normals && getMaterialValue(material) && {
            appendDefinitions: (src) => {
                src.push(`uniform float ${edgeBias};`);
                src.push(`uniform float ${centerBias};`);
                src.push(`uniform float ${power};`);
                src.push(`uniform vec3  ${edgeColor};`);
                src.push(`uniform vec3  ${centerColor};`);
            },
            getValueExpression: (viewEyeDir, viewNormal) => {
                const fresnel = `fresnel(${viewEyeDir}, ${viewNormal}, ${edgeBias}, ${centerBias}, ${power})`;
                return `mix(${edgeColor + colorSwizzle}, ${centerColor + colorSwizzle}, ${fresnel})`;
            },
            setupInputs: (getInputSetter) => {
                const uEdgeBias    = getInputSetter(edgeBias);
                const uCenterBias  = getInputSetter(centerBias);
                const uPower       = getInputSetter(power);
                const uEdgeColor   = getInputSetter(edgeColor);
                const uCenterColor = getInputSetter(centerColor);
                return (mtl) => {
                    const value = getMaterialValue(mtl);
                    uEdgeBias   (value.edgeBias);
                    uCenterBias (value.centerBias);
                    uPower      (value.power);
                    uEdgeColor  (value.edgeColor);
                    uCenterColor(value.centerColor);
                };
            }
        };
    };

    const diffuseFresnel  = setupFresnel("diffuse",  "",   mtl => mtl._diffuseFresnel);
    const specularFresnel = setupFresnel("specular", "",   mtl => mtl._specularFresnel);
    const alphaFresnel    = setupFresnel("alpha",    ".r", mtl => mtl._alphaFresnel);
    const emissiveFresnel = setupFresnel("emissive", "",   mtl => mtl._emissiveFresnel);

    const activeFresnels = [ diffuseFresnel, specularFresnel, alphaFresnel, emissiveFresnel ].filter(f => f);


    const p = phongMaterial;
    const m = metallicMaterial;
    const s = specularMaterial;

    const setup2dTexture = (name, getMaterialValue) => uvs && setupTexture(name, "sampler2D", getMaterialValue, getMaterialValue(material));

    const ambientMap   = (p          ) && setup2dTexture("ambient",   mtl => mtl._ambientMap);
    const baseColorMap = (     m     ) && setup2dTexture("baseColor", mtl => mtl._baseColorMap);
    const diffuseMap   = (p ||      s) && setup2dTexture("diffuse",   mtl => mtl._diffuseMap);
    const emissiveMap  = (p || m || s) && setup2dTexture("emissive",  mtl => mtl._emissiveMap);
    const occlusionMap = (p || m || s) && setup2dTexture("occlusion", mtl => mtl._occlusionMap);
    const alphaMap     = (p || m || s) && setup2dTexture("alpha",     mtl => mtl._alphaMap);

    const metallicMap           = m && normals && setup2dTexture("metallic",           mtl => mtl._metallicMap);
    const roughnessMap          = m && normals && setup2dTexture("roughness",          mtl => mtl._roughnessMap);
    const metallicRoughnessMap  = m && normals && setup2dTexture("metallicRoughness",  mtl => mtl._metallicRoughnessMap);

    const specularMap           = (p || s) && normals && setup2dTexture("specular",           mtl => mtl._specularMap);
    const glossinessMap         = (     s) && normals && setup2dTexture("glossiness",         mtl => mtl._glossinessMap);
    const specularGlossinessMap = (     s) && normals && setup2dTexture("specularGlossiness", mtl => mtl._specularGlossinessMap);

    const normalMap             = (p || m || s) && normals && setup2dTexture("normal", mtl => mtl._normalMap);

    const activeTextureMaps = [
        ambientMap, baseColorMap, diffuseMap, emissiveMap, occlusionMap, alphaMap,
        metallicMap, roughnessMap, metallicRoughnessMap,
        specularMap, glossinessMap, specularGlossinessMap,
        normalMap
    ].filter(t => t);

    const texturePosNeeded = activeTextureMaps.length > 0;

    const setupUniform = (name, type, getMaterialValue) => {
        const initValue = getMaterialValue(material);
        const isDefined = (type === "float") ? ((initValue !== undefined) && (initValue !== null)) : initValue;
        return isDefined && {
            appendDefinitions: (src) => src.push(`uniform ${type} ${name};`),
            getValueExpression: () => name,
            setupInputs: (getInputSetter) => {
                const setUniform = getInputSetter(name);
                return (mtl) => setUniform(getMaterialValue(mtl));
            }
        };
    };

    const l = hasNonAmbientLighting;

    const materialAmbient         = (p          ) && (!l) && setupUniform("materialAmbient", "vec3",  mtl => mtl.ambient);
    const materialDiffuse         = (p ||      s) &&   l  && setupUniform("materialDiffuse", "vec3",  mtl => mtl.diffuse);
    const materialBaseColor       = (     m     ) && setupUniform("materialBaseColor",       "vec3",  mtl => mtl.baseColor);
    const materialEmissive        = (p || m || s) && setupUniform("materialEmissive",        "vec3",  mtl => mtl.emissive);
    const materialSpecular        = (p ||      s) &&   l && setupUniform("materialSpecular", "vec3",  mtl => mtl.specular);
    const materialGlossiness      = (          s) && setupUniform("materialGlossiness",      "float", mtl => mtl.glossiness);
    const materialMetallic        = (     m     ) && setupUniform("materialMetallic",        "float", mtl => mtl.metallic);
    const materialRoughness       = (     m || s) && setupUniform("materialRoughness",       "float", mtl => mtl.roughness);
    const materialShininess       = (p          ) && l && setupUniform("materialShininess",  "float", mtl => mtl.shininess);
    const materialSpecularF0      = (     m     ) && setupUniform("materialSpecularF0",      "float", mtl => mtl.specularF0);
    const materialAlphaModeCutoff = (p || m || s) && setupUniform("materialAlphaModeCutoff", "vec4",  mtl => {
        const alpha = mtl.alpha;
        if ((alpha !== undefined) && (alpha !== null)) {
            tempVec4[0] = alpha;
            tempVec4[1] = (mtl.alphaMode === 1 ? 1 : 0);
            tempVec4[2] = mtl.alphaCutoff;
            return tempVec4;
        } else {
            return null;
        }
    });

    const activeUniforms = [
        materialAmbient, materialDiffuse, materialBaseColor, materialEmissive, materialSpecular,
        materialGlossiness, materialMetallic, materialRoughness, materialShininess, materialSpecularF0,
        materialAlphaModeCutoff
    ].filter(u => u);

    return {
        programName: "Draw",
        canActAsBackground: true,
        discardPoints: true,
        setupPointSize: true,
        setsFrontFace: true,
        setsLineWidth: true,
        useGammaOutput: true,
        meshStateBackground: background,
        transformClipPos: clipPos => background ? `${clipPos}.xyww` : clipPos,
        appendVertexDefinitions: (src) => {
            src.push("out vec3 vViewPosition;");
            if (normals) {
                src.push("out vec3 vViewNormal;");
            }
            if (lightSetup) {
                lightSetup.appendDefinitions(src);
                lightSetup.directionalLights.forEach((light, i) => {
                    if (light.isWorldSpace) {
                        src.push(`out vec3 vViewLightReverseDir${i};`);
                    }
                    if (light.shadowParameters) {
                        src.push(`out vec3 vShadowPosFromLight${i};`);
                    }
                });
                if (lightSetup.lightMap) {
                    src.push("out vec3 vWorldNormal;");
                }
            }
            if (texturePosNeeded) {
                src.push("out vec2 vUV;");
            }
            if (geometryState.colors) {
                src.push("out vec4 vColor;");
            }
        },
        appendVertexOutputs: (src, color, pickColor, uv, worldNormal, viewNormal) => {
            if (normals) {
                src.push(`vViewNormal = ${viewNormal};`);
            }
            if (lightSetup && lightSetup.lightMap) {
                src.push(`vWorldNormal = ${worldNormal};`);
            }
            if (texturePosNeeded) {
                src.push(`vUV = ${uv};`);
            }
            if (geometryState.colors) {
                src.push(`vColor = ${color};`);
            }
            src.push("   vViewPosition = viewPosition.xyz;");
            if (lightSetup) {
                src.push("const mat4 texUnitConverter = mat4(0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.5, 1.0);");
                lightSetup.directionalLights.forEach((light, i) => {
                    if (light.isWorldSpace) {
                        src.push(`vViewLightReverseDir${i} = ${light.getDirection("viewMatrix2", null)};`);
                    }
                    if (light.shadowParameters) {
                        src.push(`vShadowPosFromLight${i} = (texUnitConverter * ${light.shadowParameters.getShadowProjMatrix()} * (${light.shadowParameters.getShadowViewMatrix()} * worldPosition)).xyz;`);
                    }
                });
            }
        },
        appendFragmentDefinitions: (src) => {
            src.push("vec4 sRGBToLinear( in vec4 value ) {");
            src.push("  return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.w );");
            src.push("}");

            if (lightSetup && lightSetup.reflectionMap) {
                src.push("uniform mat4 viewMatrix;");
            }

            if (normals) {
                //--------------------------------------------------------------------------------
                // SHADING FUNCTIONS
                //--------------------------------------------------------------------------------

                // CONSTANT DEFINITIONS

                src.push("#define PI 3.14159265359");
                src.push("#define RECIPROCAL_PI 0.31830988618");
                src.push("#define RECIPROCAL_PI2 0.15915494");
                src.push("#define EPSILON 1e-6");

                src.push("#define saturate(a) clamp( a, 0.0, 1.0 )");

                src.push("struct Material {");
                src.push("   vec3    diffuseColor;");
                src.push("   float   specularRoughness;");
                src.push("   vec3    specularColor;");
                src.push("   float   shine;"); // Only used for Phong
                src.push("};");

                // COMMON UTILS

                if (metallicMaterial || specularMaterial) {

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

                    src.push("vec3 BRDF_Specular_GGX(const in vec3 incidentLightDirection, const in vec3 viewNormal, const in vec3 viewEyeDir, const in vec3 specularColor, const in float roughness) {");
                    src.push("   float alpha = ( roughness * roughness );");
                    src.push("   vec3 halfDir = normalize( incidentLightDirection + viewEyeDir );");
                    src.push("   float dotNL = saturate( dot( viewNormal, incidentLightDirection ) );");
                    src.push("   float dotNV = saturate( dot( viewNormal, viewEyeDir ) );");
                    src.push("   float dotNH = saturate( dot( viewNormal, halfDir ) );");
                    src.push("   float dotLH = saturate( dot( incidentLightDirection, halfDir ) );");
                    src.push("   vec3  F = F_Schlick( specularColor, dotLH );");
                    src.push("   float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );");
                    src.push("   float D = D_GGX( alpha, dotNH );");
                    src.push("   return F * (G * D);");
                    src.push("}");

                    src.push("vec3 BRDF_Specular_GGX_Environment(const in vec3 viewNormal, const in vec3 viewEyeDir, const in vec3 specularColor, const in float roughness) {");
                    src.push("   float dotNV = saturate(dot(viewNormal, viewEyeDir));");
                    src.push("   const vec4 c0 = vec4( -1, -0.0275, -0.572,  0.022);");
                    src.push("   const vec4 c1 = vec4(  1,  0.0425,   1.04, -0.04);");
                    src.push("   vec4 r = roughness * c0 + c1;");
                    src.push("   float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;");
                    src.push("   vec2 AB    = vec2(-1.04, 1.04) * a004 + r.zw;");
                    src.push("   return specularColor * AB.x + AB.y;");
                    src.push("}");

                } // (metallicMaterial || specularMaterial)

            } // geometry.normals

            //--------------------------------------------------------------------------------
            // GEOMETRY INPUTS
            //--------------------------------------------------------------------------------

            src.push("in vec3 vViewPosition;");

            if (geometryState.colors) {
                src.push("in vec4 vColor;");
            }

            if (texturePosNeeded) {
                src.push("in vec2 vUV;");
            }

            if (normals) {
                src.push("in vec3 vViewNormal;");
            }
            if (lightSetup && lightSetup.lightMap) {
                src.push("in vec3 vWorldNormal;");
            }

            //--------------------------------------------------------------------------------
            // MATERIAL CHANNEL INPUTS
            //--------------------------------------------------------------------------------

            activeUniforms.forEach(u => u.appendDefinitions(src));

            //--------------------------------------------------------------------------------
            // MATERIAL TEXTURE INPUTS
            //--------------------------------------------------------------------------------

            activeTextureMaps.forEach(t => t.appendDefinitions(src));

            if (normalMap) {
                src.push("vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec2 uv, vec4 texel ) {");
                src.push("      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );");
                src.push("      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );");
                src.push("      vec2 st0 = dFdx( uv.st );");
                src.push("      vec2 st1 = dFdy( uv.st );");
                src.push("      vec3 S = normalize( q0 * st1.t - q1 * st0.t );");
                src.push("      vec3 T = normalize( -q0 * st1.s + q1 * st0.s );");
                src.push("      vec3 N = normalize( surf_norm );");
                src.push("      vec3 mapN = texel.xyz * 2.0 - 1.0;");
                src.push("      mat3 tsn = mat3( S, T, N );");
                //     src.push("      mapN *= 3.0;");
                src.push("      return normalize( tsn * mapN );");
                src.push("}");
            }

            //--------------------------------------------------------------------------------
            // MATERIAL FRESNEL INPUTS
            //--------------------------------------------------------------------------------

            if (activeFresnels.length > 0) {
                src.push("float fresnel(vec3 eyeDir, vec3 normal, float edgeBias, float centerBias, float power) {");
                src.push("    float fr = abs(dot(eyeDir, normal));");
                src.push("    float finalFr = clamp((fr - edgeBias) / (centerBias - edgeBias), 0.0, 1.0);");
                src.push("    return pow(finalFr, power);");
                src.push("}");

                activeFresnels.forEach(f => f.appendDefinitions(src));
            }

            //--------------------------------------------------------------------------------
            // LIGHT SOURCES
            //--------------------------------------------------------------------------------

            if (lightSetup) {
                lightSetup.appendDefinitions(src);
                lightSetup.directionalLights.forEach((light, i) => {
                    if (light.isWorldSpace) {
                        src.push(`in vec3 vViewLightReverseDir${i};`);
                    }
                    if (light.shadowParameters) {
                        src.push(`in vec3 vShadowPosFromLight${i};`);
                    }
                });
            }

            src.push("uniform vec4 colorize;");

            //================================================================================
            // MAIN
            //================================================================================
            src.push("out vec4 outColor;");
        },
        appendFragmentOutputs: (src, getGammaOutputExpression) => {
            if (texturePosNeeded) {
                src.push("vec4 texturePos = vec4(vUV.s, vUV.t, 1.0, 1.0);");
            }

            const diffuseColor = (materialDiffuse
                                  ? materialDiffuse.getValueExpression()
                                  : (materialBaseColor
                                     ? materialBaseColor.getValueExpression()
                                     : "vec3(1.0)"));
            src.push(`vec3 diffuseColor = ${diffuseColor};`);

            src.push(`vec4 alphaModeCutoff = ${materialAlphaModeCutoff ? materialAlphaModeCutoff.getValueExpression() : "vec4(1.0, 0.0, 0.0, 0.0)"};`);
            src.push("float alpha = alphaModeCutoff[0];");
            alphaMap && src.push(`alpha *= ${alphaMap.getValueExpression("texturePos")}.r;`);

            if (geometryState.colors) {
                src.push("diffuseColor *= vColor.rgb;");
                src.push("alpha *= vColor.a;");
            }
            if (baseColorMap) {
                src.push("vec4 baseColorTexel = " + baseColorMap.getValueExpression("texturePos") + ";");
                src.push("diffuseColor *= baseColorTexel.rgb;");
                src.push("alpha *= baseColorTexel.a;");
            }
            if (diffuseMap) {
                src.push("vec4 diffuseTexel = " + diffuseMap.getValueExpression("texturePos") + ";");
                src.push("diffuseColor *= diffuseTexel.rgb;");
                src.push("alpha *= diffuseTexel.a;");
            }

            src.push(`vec3 emissiveColor = ${materialEmissive ? materialEmissive.getValueExpression() : "vec3(0.0)"};`);
            emissiveMap && src.push(`emissiveColor = ${emissiveMap.getValueExpression("texturePos")}.rgb;`);

            if (hasNonAmbientLighting) {

                src.push(`vec3 specular    = ${materialSpecular   ? materialSpecular.getValueExpression()   : "vec3(1.0)"};`);
                src.push(`float glossiness = ${materialGlossiness ? materialGlossiness.getValueExpression() : "1.0"};`);
                src.push(`float metallic   = ${materialMetallic   ? materialMetallic.getValueExpression()   : "1.0"};`);
                src.push(`float roughness  = ${materialRoughness  ? materialRoughness.getValueExpression()  : "1.0"};`);
                src.push(`float shininess  = ${materialShininess  ? materialShininess.getValueExpression()  : "1.0"};`);
                src.push(`float specularF0 = ${materialSpecularF0 ? materialSpecularF0.getValueExpression() : "1.0"};`);
                src.push(`float occlusion  = ${occlusionMap ? `${occlusionMap.getValueExpression("texturePos")}.r` : "1.0"};`);

                //--------------------------------------------------------------------------------
                // SHADING
                //--------------------------------------------------------------------------------

                metallicMap  && src.push(`metallic  *= ${metallicMap.getValueExpression("texturePos")}.r;`);
                roughnessMap && src.push(`roughness *= ${roughnessMap.getValueExpression("texturePos")}.r;`);

                if (metallicRoughnessMap) {
                    src.push("vec4 metalRoughTexel = " + metallicRoughnessMap.getValueExpression("texturePos") + ";");
                    src.push("metallic  *= metalRoughTexel.b;");
                    src.push("roughness *= metalRoughTexel.g;");
                }

                specularMap   && src.push(`specular *= ${specularMap.getValueExpression("texturePos")}.rgb;`);
                glossinessMap && src.push(`glossiness *= ${glossinessMap.getValueExpression("texturePos")}.r;`);

                if (specularGlossinessMap) {
                    src.push("vec4 specGlossTexel = " + specularGlossinessMap.getValueExpression("texturePos") + ";"); // TODO: what if only RGB texture?
                    src.push("specular   *= specGlossTexel.rgb;");
                    src.push("glossiness *= specGlossTexel.a;");
                }

                const vViewNormalized = "normalize(vViewNormal)";
                const viewNormal = (normalMap
                                    ? `perturbNormal2Arb(vViewPosition, ${vViewNormalized}, ${normalMap.getTexCoordExpression("texturePos")}, ${normalMap.getValueExpression("texturePos")})`
                                    : vViewNormalized);
                src.push(`vec3 viewNormal = ${viewNormal};`);

                src.push("vec3 viewEyeDir = normalize(-vViewPosition);");

                diffuseFresnel  && src.push(`diffuseColor  *= ${diffuseFresnel.getValueExpression ("viewEyeDir", "viewNormal")};`);
                specularFresnel && src.push(`specular      *= ${specularFresnel.getValueExpression("viewEyeDir", "viewNormal")};`);
                alphaFresnel    && src.push(`alpha         *= ${alphaFresnel.getValueExpression   ("viewEyeDir", "viewNormal")};`);
                emissiveFresnel && src.push(`emissiveColor *= ${emissiveFresnel.getValueExpression("viewEyeDir", "viewNormal")};`);

                src.push("if (alphaModeCutoff[1] == 1.0 && alpha < alphaModeCutoff[2]) {"); // ie. (alphaMode == "mask" && alpha < alphaCutoff)
                src.push("   discard;"); // TODO: Discard earlier within this shader?
                src.push("}");

                // PREPARE INPUTS FOR SHADER FUNCTIONS
                src.push("Material       material;");

                if (phongMaterial) {
                    src.push("material.diffuseColor      = diffuseColor;");
                    src.push("material.specularColor     = specular;");
                    src.push("material.shine             = shininess;");
                }

                if (specularMaterial) {
                    src.push("float oneMinusSpecularStrength = 1.0 - max(max(specular.r, specular.g ),specular.b);"); // Energy conservation
                    src.push("material.diffuseColor      = diffuseColor * oneMinusSpecularStrength;");
                    src.push("material.specularRoughness = clamp( 1.0 - glossiness, 0.04, 1.0 );");
                    src.push("material.specularColor     = specular;");
                }

                if (metallicMaterial) {
                    src.push("float dielectricSpecular = 0.16 * specularF0 * specularF0;");
                    src.push("material.diffuseColor      = diffuseColor * (1.0 - dielectricSpecular) * (1.0 - metallic);");
                    src.push("material.specularRoughness = clamp(roughness, 0.04, 1.0);");
                    src.push("material.specularColor     = mix(vec3(dielectricSpecular), diffuseColor, metallic);");
                }

                // ENVIRONMENT AND REFLECTION MAP SHADING

                if (phongMaterial || metallicMaterial || specularMaterial) {
                    src.push("vec3 reflDiff = vec3(0.0);");
                    src.push("vec3 reflSpec = vec3(0.0);");

                    if (lightSetup.lightMap) {
                        const irradiance = `${lightSetup.lightMap.getValueExpression("normalize(vWorldNormal)")}.rgb`;
                        src.push(`reflDiff += material.diffuseColor * ${irradiance};`);
                    }
                    if (lightSetup.reflectionMap) {
                        const reflectVec = `reflect(-viewEyeDir, viewNormal)`;
                        const spec = (phongMaterial
                                      ? `0.2 * PI * ${lightSetup.reflectionMap.getValueExpression(reflectVec)}.rgb`
                                      : (function() {
                                          const blinnExpFromRoughness = `2.0 / pow(material.specularRoughness + 0.0001, 2.0) - 2.0`;
                                          const specularBRDFContrib = "BRDF_Specular_GGX_Environment(viewNormal, viewEyeDir, material.specularColor, material.specularRoughness)";

                                          const viewReflectVec = `normalize((vec4(${reflectVec}, 0.0) * viewMatrix).xyz)`;
                                          const maxMIPLevelScalar = "4.0";
                                          const desiredMIPLevel = `${maxMIPLevelScalar} - 0.39624 - 0.25 * log2(pow(${blinnExpFromRoughness}, 2.0) + 1.0)`;
                                          const mipLevel = `clamp(${desiredMIPLevel}, 0.0, ${maxMIPLevelScalar})`; //TODO: a random factor - fix this
                                          const indirectRadiance = `${lightSetup.reflectionMap.getValueExpression(viewReflectVec, mipLevel)}.rgb`;

                                          return `${specularBRDFContrib} * ${indirectRadiance}`;
                                      })());
                        src.push(`reflSpec += ${spec};`);
                    }
                    if (lightSetup.directionalLights.some(ligth => ligth.shadowParameters)) {
                        src.push("const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0 * 256.0), 1.0/(256.0*256.0*256.0));");
                        src.push("const float texelSize = 1.0 / 1024.0;");
                        src.push("float shadow;");
                        src.push("float fragmentDepth;");
                    }
                    lightSetup.directionalLights.forEach((light, i) => {
                        if (light.shadowParameters) {
                            const shadowAcneRemover = "0.007";
                            src.push(`fragmentDepth = vShadowPosFromLight${i}.z - ${shadowAcneRemover};`);
                            src.push("shadow = 0.0;");
                            src.push("for (int x = -3; x <= 3; x++) {");
                            src.push("  for (int y = -3; y <= 3; y++) {");
                            src.push(`      float texelDepth = dot(texture(${light.getShadowMap()}, vShadowPosFromLight${i}.xy + vec2(x, y) * texelSize), bitShift);`);
                            src.push(`      if (fragmentDepth < texelDepth) {`);
                            src.push("          shadow += 1.0;");
                            src.push("      }");
                            src.push("  }");
                            src.push("}");
                            src.push("shadow /= 9.0;");
                        }
                        src.push(`vec3 lightColor${i} = ${light.getColor()}${light.shadowParameters ? (" * " + "shadow") : ""};`);
                        src.push(`vec3 lightDirection${i} = ${light.isWorldSpace ? `vViewLightReverseDir${i}` : light.getDirection(null, "vViewPosition")};`);
                        const dotNL = `saturate(dot(viewNormal, lightDirection${i}))`;
                        src.push(`vec3 irradiance${i} = ${dotNL} * lightColor${i} * PI;`);
                        src.push(`reflDiff += irradiance${i} * (RECIPROCAL_PI * material.diffuseColor);`);
                        const spec = (phongMaterial
                                      ? `lightColor${i} * material.specularColor * pow(max(dot(reflect(-lightDirection${i}, -viewNormal), viewEyeDir), 0.0), material.shine)`
                                      : `irradiance${i} * BRDF_Specular_GGX(lightDirection${i}, viewNormal, viewEyeDir, material.specularColor, material.specularRoughness)`);
                        src.push(`reflSpec += ${spec};`);
                    });
                }

                const ambient = phongMaterial && `${lightSetup.getAmbientColor()} * diffuseColor`;
                src.push("vec3 outgoingLight = emissiveColor + occlusion * (reflDiff + reflSpec)" + (ambient ? (" + " + ambient) : "") + ";");
            } else {
                src.push(`vec3 ambientColor = ${materialAmbient ? materialAmbient.getValueExpression() : "vec3(1.0)"};`);
                ambientMap && src.push(`ambientColor *= ${ambientMap.getValueExpression("texturePos")}.rgb;`);
                lightSetup && src.push(`ambientColor *= ${lightSetup.getAmbientColor()};`);
                src.push("vec3 outgoingLight = emissiveColor + ambientColor;");
            }

            src.push("vec4 fragColor = vec4(outgoingLight, alpha) * colorize;");

            src.push(`outColor = ${getGammaOutputExpression ? getGammaOutputExpression("fragColor") : "fragColor"};`);
        },
        setupMeshInputs: (getInputSetter) => {
            const colorize = getInputSetter("colorize");
            return (mesh) => colorize(mesh.colorize);
        },
        setupMaterialInputs: (getInputSetter) => {
            const binders = activeFresnels.concat(activeTextureMaps).concat(activeUniforms).map(f => f && f.setupInputs(getInputSetter));
            return (binders.length > 0) && (mtl => binders.forEach(bind => bind(mtl)));
        },
        setupLightInputs: lightSetup && lightSetup.setupInputs
    };
};

DrawShaderSource.getHash = (mesh) => [
    mesh._state.drawHash,
    mesh.scene.gammaOutput ? "go" : "",
    mesh.scene._lightsState.getHash(),
    mesh._material._state.hash
];
