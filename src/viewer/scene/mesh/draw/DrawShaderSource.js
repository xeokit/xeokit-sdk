import {createLightSetup, lazyShaderVariable, setupTexture} from "../MeshRenderer.js";
import {math} from "../../math/math.js";
const tempVec4 = math.vec4();

export const DrawShaderSource = function(meshDrawHash, programVariables, geometry, material, scene) {
    const materialState = material._state;
    const phongMaterial    = (materialState.type === "PhongMaterial");
    const metallicMaterial = (materialState.type === "MetallicMaterial");
    const specularMaterial = (materialState.type === "SpecularMaterial");

    const attributes = geometry.attributes;
    const hasNormals = !!attributes.normal;
    const lightSetup = createLightSetup(programVariables, scene._lightsState, !!attributes.uv);

    const colorize = programVariables.createUniform("vec4", "colorize");

    const perturbNormal2Arb = lazyShaderVariable("perturbNormal2Arb");
    const fresnel = lazyShaderVariable("fresnel");

    const setupFresnel = (name, colorSwizzle, getMaterialValue) => {
        const edgeBias    = programVariables.createUniform("float", name + "FresnelEdgeBias");
        const centerBias  = programVariables.createUniform("float", name + "FresnelCenterBias");
        const power       = programVariables.createUniform("float", name + "FresnelPower");
        const edgeColor   = programVariables.createUniform("vec3",  name + "FresnelEdgeColor");
        const centerColor = programVariables.createUniform("vec3",  name + "FresnelCenterColor");

        return getMaterialValue(material) && {
            getValueExpression: (viewEyeDir, viewNormal) => {
                const f = `${fresnel}(${viewEyeDir}, ${viewNormal}, ${edgeBias}, ${centerBias}, ${power})`;
                return `mix(${edgeColor + colorSwizzle}, ${centerColor + colorSwizzle}, ${f})`;
            },
            setupInputs: () => {
                const setEdgeBias    = edgeBias.setupInputs();
                const setCenterBias  = centerBias.setupInputs();
                const setPower       = power.setupInputs();
                const setEdgeColor   = edgeColor.setupInputs();
                const setCenterColor = centerColor.setupInputs();
                return (mtl) => {
                    const value = getMaterialValue(mtl);
                    setEdgeBias   (value.edgeBias);
                    setCenterBias (value.centerBias);
                    setPower      (value.power);
                    setEdgeColor  (value.edgeColor);
                    setCenterColor(value.centerColor);
                };
            }
        };
    };

    const diffuseFresnel  = setupFresnel("diffuse",  "",   mtl => mtl._diffuseFresnel);
    const specularFresnel = setupFresnel("specular", "",   mtl => mtl._specularFresnel);
    const emissiveFresnel = setupFresnel("emissive", "",   mtl => mtl._emissiveFresnel);
    const alphaFresnel    = setupFresnel("alpha",    ".r", mtl => mtl._alphaFresnel);


    const setup2dTexture = (name, getMaterialValue) => {
        return attributes.uv && (function() {
            const initTex = getMaterialValue(material);
            const tex = initTex && setupTexture(programVariables, "sampler2D", name, initTex.encoding, !!initTex._state.matrix);
            return tex && {
                getTexCoordExpression: tex.getTexCoordExpression,
                getValueExpression:    tex.getValueExpression,
                setupInputs:           () => {
                    const setInputsState = tex.setupInputs();
                    return setInputsState && ((mtl) => {
                        const value = getMaterialValue(mtl);
                        setInputsState(value._state.texture, value._state.matrix);
                    });
                }
            };
        })();
    };

    const ambientMap            = setup2dTexture("ambient",            mtl => mtl._ambientMap);
    const baseColorMap          = setup2dTexture("baseColor",          mtl => mtl._baseColorMap);
    const diffuseMap            = setup2dTexture("diffuse",            mtl => mtl._diffuseMap);
    const emissiveMap           = setup2dTexture("emissive",           mtl => mtl._emissiveMap);
    const occlusionMap          = setup2dTexture("occlusion",          mtl => mtl._occlusionMap);
    const alphaMap              = setup2dTexture("alpha",              mtl => mtl._alphaMap);
    const metallicMap           = setup2dTexture("metallic",           mtl => mtl._metallicMap);
    const roughnessMap          = setup2dTexture("roughness",          mtl => mtl._roughnessMap);
    const metallicRoughnessMap  = setup2dTexture("metallicRoughness",  mtl => mtl._metallicRoughnessMap);
    const specularMap           = setup2dTexture("specular",           mtl => mtl._specularMap);
    const glossinessMap         = setup2dTexture("glossiness",         mtl => mtl._glossinessMap);
    const specularGlossinessMap = setup2dTexture("specularGlossiness", mtl => mtl._specularGlossinessMap);
    const normalMap             = setup2dTexture("normal",             mtl => mtl._normalMap);


    const setupUniform = (name, type, getMaterialValue) => {
        const initValue = getMaterialValue(material);
        const isDefined = (type === "float") ? ((initValue !== undefined) && (initValue !== null)) : initValue;
        const uniform = programVariables.createUniform(type, name);
        return isDefined && {
            toString: uniform.toString,
            setupInputs: () => {
                const setUniform = uniform.setupInputs();
                return setUniform && ((mtl) => setUniform(getMaterialValue(mtl)));
            }
        };
    };

    const materialAmbient         = setupUniform("materialAmbient",    "vec3",  mtl => mtl.ambient);
    const materialDiffuse         = setupUniform("materialDiffuse",    "vec3",  mtl => mtl.diffuse);
    const materialBaseColor       = setupUniform("materialBaseColor",  "vec3",  mtl => mtl.baseColor);
    const materialEmissive        = setupUniform("materialEmissive",   "vec3",  mtl => mtl.emissive);
    const materialSpecular        = setupUniform("materialSpecular",   "vec3",  mtl => mtl.specular);
    const materialGlossiness      = setupUniform("materialGlossiness", "float", mtl => mtl.glossiness);
    const materialMetallic        = setupUniform("materialMetallic",   "float", mtl => mtl.metallic);
    const materialRoughness       = setupUniform("materialRoughness",  "float", mtl => mtl.roughness);
    const materialShininess       = setupUniform("materialShininess",  "float", mtl => mtl.shininess);
    const materialSpecularF0      = setupUniform("materialSpecularF0", "float", mtl => mtl.specularF0);
    const materialAlphaModeCutoff = setupUniform("materialAlphaModeCutoff", "vec4",  mtl => {
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

    const materialInputs = [
        diffuseFresnel, specularFresnel, emissiveFresnel, alphaFresnel,

        ambientMap, baseColorMap, diffuseMap, emissiveMap, occlusionMap, alphaMap,
        metallicMap, roughnessMap, metallicRoughnessMap,
        specularMap, glossinessMap, specularGlossinessMap,
        normalMap,

        materialAmbient, materialDiffuse, materialBaseColor, materialEmissive, materialSpecular,
        materialGlossiness, materialMetallic, materialRoughness, materialShininess, materialSpecularF0,
        materialAlphaModeCutoff
        ].filter(i => i);

    const vViewPosition = programVariables.createVarying("vec3", "vViewPosition", () => `${attributes.position.view}.xyz`);
    const texturePos = programVariables.createVarying("vec4", "texturePos", () => `vec4(${attributes.uv}, 1.0, 1.0)`);
    const vColor = attributes.color && programVariables.createVarying("vec4", "vColor", () => attributes.color);

    const vViewNormal = programVariables.createVarying("vec3", "vViewNormal", () => attributes.normal.view);
    const texUnitConverter = `mat4(0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.5, 1.0)`;
    const vDirectionals = lightSetup.directionalLights.map((light, i) => ({
        vViewLightReverseDir: programVariables.createVarying("vec3", `vViewLightReverseDir${i}`, () => light.getDirection(geometry.viewMatrix, null)),
        vShadowPosFromLight:  programVariables.createVarying("vec3", `vShadowPosFromLight${i}`, () => `(${texUnitConverter} * ${light.shadowParameters.getShadowProjMatrix()} * (${light.shadowParameters.getShadowViewMatrix()} * ${attributes.position.world})).xyz`)
    }));
    const vWorldNormal = programVariables.createVarying("vec3", "vWorldNormal", () => attributes.normal.world);

    const outColor = programVariables.createOutput("vec4", "outColor");

    return {
        getHash: () => [
            meshDrawHash,
            scene.gammaOutput ? "go" : "",
            lightSetup.getHash(),
            material._state.hash
        ],
        programName: "Draw",
        canActAsBackground: true,
        discardPoints: true,
        setupPointSize: true,
        setsLineWidth: true,
        appendFragmentDefinitions: (src) => {
            if (hasNormals) {
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

            if (perturbNormal2Arb.needed) {
                src.push(`vec3 ${perturbNormal2Arb}( vec3 eye_pos, vec3 surf_norm, vec2 uv, vec4 texel ) {`);
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

            if (fresnel.needed) {
                src.push(`float ${fresnel}(vec3 eyeDir, vec3 normal, float edgeBias, float centerBias, float power) {`);
                src.push("    float fr = abs(dot(eyeDir, normal));");
                src.push("    float finalFr = clamp((fr - edgeBias) / (centerBias - edgeBias), 0.0, 1.0);");
                src.push("    return pow(finalFr, power);");
                src.push("}");
            }
        },
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord) => {
            const hasNonAmbientLighting = hasNormals && ((lightSetup.directionalLights.length > 0) || lightSetup.getIrradiance || lightSetup.getReflection);
            src.push(`vec3 diffuseColor = ${(hasNonAmbientLighting && (phongMaterial || specularMaterial) && materialDiffuse) || (metallicMaterial && materialBaseColor) || "vec3(1.0)"};`);
            src.push(`vec4 alphaModeCutoff = ${((phongMaterial || metallicMaterial || specularMaterial) && materialAlphaModeCutoff) || "vec4(1.0, 0.0, 0.0, 0.0)"};`);
            src.push("float alpha = alphaModeCutoff[0];");
            (phongMaterial || metallicMaterial || specularMaterial) && alphaMap && src.push(`alpha *= ${alphaMap.getValueExpression(texturePos)}.r;`);

            if (vColor) {
                src.push(`diffuseColor *= ${vColor}.rgb;`);
                src.push(`alpha *= ${vColor}.a;`);
            }
            if (metallicMaterial && baseColorMap) {
                src.push("vec4 baseColorTexel = " + baseColorMap.getValueExpression(texturePos) + ";");
                src.push("diffuseColor *= baseColorTexel.rgb;");
                src.push("alpha *= baseColorTexel.a;");
            }
            if ((phongMaterial || specularMaterial) && diffuseMap) {
                src.push("vec4 diffuseTexel = " + diffuseMap.getValueExpression(texturePos) + ";");
                src.push("diffuseColor *= diffuseTexel.rgb;");
                src.push("alpha *= diffuseTexel.a;");
            }

            src.push(`vec3 emissiveColor = ${((phongMaterial || metallicMaterial || specularMaterial) && materialEmissive) || "vec3(0.0)"};`);
            (phongMaterial || metallicMaterial || specularMaterial) && emissiveMap && src.push(`emissiveColor = ${emissiveMap.getValueExpression(texturePos)}.rgb;`);

            if (hasNonAmbientLighting) {

                src.push(`vec3 specular    = ${((phongMaterial || specularMaterial) && materialSpecular)   || "vec3(1.0)"};`);
                src.push(`float glossiness = ${(specularMaterial && materialGlossiness) || "1.0"};`);
                src.push(`float metallic   = ${(metallicMaterial && materialMetallic)   || "1.0"};`);
                src.push(`float roughness  = ${((metallicMaterial || specularMaterial) && materialRoughness)  || "1.0"};`);
                src.push(`float shininess  = ${(phongMaterial && materialShininess)|| "1.0"};`);
                src.push(`float specularF0 = ${(metallicMaterial && materialSpecularF0) || "1.0"};`);
                src.push(`float occlusion  = ${((phongMaterial || metallicMaterial || specularMaterial) && occlusionMap) ? `${occlusionMap.getValueExpression(texturePos)}.r` : "1.0"};`);

                //--------------------------------------------------------------------------------
                // SHADING
                //--------------------------------------------------------------------------------

                metallicMaterial && metallicMap  && src.push(`metallic  *= ${metallicMap.getValueExpression(texturePos)}.r;`);
                metallicMaterial && roughnessMap && src.push(`roughness *= ${roughnessMap.getValueExpression(texturePos)}.r;`);

                if (metallicMaterial && metallicRoughnessMap) {
                    src.push("vec4 metalRoughTexel = " + metallicRoughnessMap.getValueExpression(texturePos) + ";");
                    src.push("metallic  *= metalRoughTexel.b;");
                    src.push("roughness *= metalRoughTexel.g;");
                }

                (phongMaterial || specularMaterial) && specularMap && src.push(`specular *= ${specularMap.getValueExpression(texturePos)}.rgb;`);
                specularMaterial && glossinessMap && src.push(`glossiness *= ${glossinessMap.getValueExpression(texturePos)}.r;`);

                if (specularMaterial && specularGlossinessMap) {
                    src.push("vec4 specGlossTexel = " + specularGlossinessMap.getValueExpression(texturePos) + ";"); // TODO: what if only RGB texture?
                    src.push("specular   *= specGlossTexel.rgb;");
                    src.push("glossiness *= specGlossTexel.a;");
                }

                const vViewNormalized = `normalize(${vViewNormal})`;
                const viewNormal = (((phongMaterial || metallicMaterial || specularMaterial) && normalMap)
                                    ? `${perturbNormal2Arb}(${vViewPosition}, ${vViewNormalized}, ${normalMap.getTexCoordExpression(texturePos)}, ${normalMap.getValueExpression(texturePos)})`
                                    : vViewNormalized);
                src.push(`vec3 viewNormal = ${viewNormal};`);

                src.push(`vec3 viewEyeDir = normalize(-${vViewPosition});`);

                diffuseFresnel  && src.push(`diffuseColor  *= ${diffuseFresnel.getValueExpression ("viewEyeDir", "viewNormal")};`);
                specularFresnel && src.push(`specular      *= ${specularFresnel.getValueExpression("viewEyeDir", "viewNormal")};`);
                emissiveFresnel && src.push(`emissiveColor *= ${emissiveFresnel.getValueExpression("viewEyeDir", "viewNormal")};`);
                alphaFresnel    && src.push(`alpha         *= ${alphaFresnel.getValueExpression   ("viewEyeDir", "viewNormal")};`);

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

                    lightSetup.getIrradiance && src.push(`reflDiff += ${lightSetup.getIrradiance(`normalize(${vWorldNormal})`)};`);

                    if (lightSetup.getReflection) {
                        const reflectVec = `reflect(-viewEyeDir, viewNormal)`;
                        const spec = (phongMaterial
                                      ? `0.2 * PI * ${lightSetup.getReflection(reflectVec)}`
                                      : (function() {
                                          const blinnExpFromRoughness = `2.0 / pow(material.specularRoughness + 0.0001, 2.0) - 2.0`;
                                          const specularBRDFContrib = "BRDF_Specular_GGX_Environment(viewNormal, viewEyeDir, material.specularColor, material.specularRoughness)";

                                          const viewReflectVec = `normalize((vec4(${reflectVec}, 0.0) * ${geometry.viewMatrix}).xyz)`;
                                          const maxMIPLevelScalar = "4.0";
                                          const desiredMIPLevel = `${maxMIPLevelScalar} - 0.39624 - 0.25 * log2(pow(${blinnExpFromRoughness}, 2.0) + 1.0)`;
                                          const mipLevel = `clamp(${desiredMIPLevel}, 0.0, ${maxMIPLevelScalar})`; //TODO: a random factor - fix this
                                          return `${specularBRDFContrib} * ${lightSetup.getReflection(viewReflectVec, mipLevel)}`;
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
                            src.push(`fragmentDepth = ${vDirectionals[i].vShadowPosFromLight}.z - ${shadowAcneRemover};`);
                            src.push("shadow = 0.0;");
                            src.push("for (int x = -3; x <= 3; x++) {");
                            src.push("  for (int y = -3; y <= 3; y++) {");
                            src.push(`      float texelDepth = dot(texture(${light.getShadowMap()}, ${vDirectionals[i].vShadowPosFromLight}.xy + vec2(x, y) * texelSize), bitShift);`);
                            src.push(`      if (fragmentDepth < texelDepth) {`);
                            src.push("          shadow += 1.0;");
                            src.push("      }");
                            src.push("  }");
                            src.push("}");
                            src.push("shadow /= 9.0;");
                        }
                        src.push(`vec3 lightColor${i} = ${light.getColor()}${light.shadowParameters ? (" * " + "shadow") : ""};`);
                        src.push(`vec3 lightDirection${i} = ${light.isWorldSpace ? vDirectionals[i].vViewLightReverseDir : light.getDirection(null, vViewPosition)};`);
                        const dotNL = `saturate(dot(viewNormal, lightDirection${i}))`;
                        src.push(`vec3 irradiance${i} = ${dotNL} * lightColor${i};`);
                        src.push(`reflDiff += irradiance${i};`);
                        const spec = (phongMaterial
                                      ? `lightColor${i} * material.specularColor * pow(max(dot(reflect(-lightDirection${i}, -viewNormal), viewEyeDir), 0.0), material.shine)`
                                      : `irradiance${i} * PI * BRDF_Specular_GGX(lightDirection${i}, viewNormal, viewEyeDir, material.specularColor, material.specularRoughness)`);
                        src.push(`reflSpec += ${spec};`);
                    });
                }

                const ambient = phongMaterial && `${lightSetup.getAmbientColor()} * diffuseColor`;
                src.push("vec3 outgoingLight = emissiveColor + occlusion * (reflDiff * material.diffuseColor + reflSpec)" + (ambient ? (" + " + ambient) : "") + ";");
            } else {
                src.push(`vec3 ambientColor = ${(phongMaterial && materialAmbient) || "vec3(1.0)"};`);
                phongMaterial && ambientMap && src.push(`ambientColor *= ${ambientMap.getValueExpression(texturePos)}.rgb;`);
                src.push(`ambientColor *= ${lightSetup.getAmbientColor()};`);
                src.push("vec3 outgoingLight = emissiveColor + ambientColor;");
            }

            src.push(`vec4 fragColor = ${colorize} * vec4(outgoingLight, alpha);`);

            src.push(`${outColor} = ${getGammaOutputExpression ? getGammaOutputExpression("fragColor") : "fragColor"};`);
        },
        setupProgramInputs: () => {
            const setColorize = colorize.setupInputs();
            const materialBinders = materialInputs.map(f => f.setupInputs()).filter(b => b);
            return {
                setLightStateValues: lightSetup.setupInputs(),
                setMeshStateValues: (mesh) => setColorize(mesh.colorize),
                setMaterialStateValues: (materialBinders.length > 0) && (mtl => materialBinders.forEach(bind => bind(mtl)))
            };
        }
    };
};
