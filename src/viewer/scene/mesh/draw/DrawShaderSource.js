import {createLightSetup, setupTexture} from "../../webgl/WebGLRenderer.js";
import {math} from "../../math/math.js";
const tempVec4 = math.vec4();

export const DrawShaderSource = function(meshDrawHash, programVariables, geometry, material, scene) {
    const materialState = material._state;
    const phongMaterial    = (materialState.type === "PhongMaterial");
    const metallicMaterial = (materialState.type === "MetallicMaterial");
    const specularMaterial = (materialState.type === "SpecularMaterial");

    const attributes = geometry.attributes;
    const lightSetup = createLightSetup(programVariables, scene._lightsState);

    const colorize = programVariables.createUniform("vec4", "colorize", (set, state) => set(state.meshColorize));

    const fresnel = programVariables.createFragmentDefinition(
        "fresnel",
        (name, src) => {
            src.push(`float ${name}(vec3 eyeDir, vec3 normal, float edgeBias, float centerBias, float power) {`);
            src.push("    float fr = abs(dot(eyeDir, normal));");
            src.push("    float finalFr = clamp((fr - edgeBias) / (centerBias - edgeBias), 0.0, 1.0);");
            src.push("    return pow(finalFr, power);");
            src.push("}");
        });

    const setupFresnel = (name, colorSwizzle, getMaterialValue) => {
        const fresnelUniform = (type, namePostfix, getParameterValue) => {
            return programVariables.createUniform(type, name + "Fresnel" + namePostfix, (set, state) => set(getParameterValue(getMaterialValue(state.material))));
        };
        const edgeBias    = fresnelUniform("float", "EdgeBias",    (fresnelValue => fresnelValue.edgeBias));
        const centerBias  = fresnelUniform("float", "CenterBias",  (fresnelValue => fresnelValue.centerBias));
        const power       = fresnelUniform("float", "Power",       (fresnelValue => fresnelValue.power));
        const edgeColor   = fresnelUniform("vec3",  "EdgeColor",   (fresnelValue => fresnelValue.edgeColor));
        const centerColor = fresnelUniform("vec3",  "CenterColor", (fresnelValue => fresnelValue.centerColor));

        return getMaterialValue(material) && ((viewEyeDir, viewNormal) => {
                const f = `${fresnel}(${viewEyeDir}, ${viewNormal}, ${edgeBias}, ${centerBias}, ${power})`;
                return `mix(${edgeColor + colorSwizzle}, ${centerColor + colorSwizzle}, ${f})`;
        });
    };

    const diffuseFresnel  = setupFresnel("diffuse",  "",   mtl => mtl._diffuseFresnel);
    const specularFresnel = setupFresnel("specular", "",   mtl => mtl._specularFresnel);
    const emissiveFresnel = setupFresnel("emissive", "",   mtl => mtl._emissiveFresnel);
    const alphaFresnel    = setupFresnel("alpha",    ".r", mtl => mtl._alphaFresnel);


    const setup2dTexture = (name, getMaterialValue) => {
        const initTex = attributes.uv && getMaterialValue(material);
        const tex = initTex && setupTexture(programVariables, "sampler2D", name, initTex.encoding, (set, state) => set(getMaterialValue(state.material)._state.texture));
        return tex && (function() {
            const matrix = initTex._state.matrix && programVariables.createUniform("mat4", name + "MapMatrix", (set, state) => set(getMaterialValue(state.material)._state.matrix));
            const getTexCoordExpression = matrix ? (texPos => `(${matrix} * ${texPos}).st`) : (texPos => `${texPos}.st`);
            const sample = (texturePos, bias) => tex(getTexCoordExpression(texturePos, bias));
            sample.getTexCoordExpression = getTexCoordExpression;
            return sample;
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
        return isDefined && programVariables.createUniform(type, name, (set, state) => set(getMaterialValue(state.material)));
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

    const saturate = programVariables.createFragmentDefinition(
        "saturate",
        (name, src) => src.push(`float ${name}(const in float a) { return clamp(a, 0.0, 1.0); }`));

    const BRDF_Specular_GGX = programVariables.createFragmentDefinition(
        "BRDF_Specular_GGX",
        (name, src) => {
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
            src.push("   return 0.5 / max( gv + gl, 1e-6 );");
            src.push("}");

            src.push("float D_GGX(const in float alpha, const in float dotNH) {");
            src.push("   float a2 = ( alpha * alpha );");
            src.push("   float denom = ( dotNH * dotNH) * ( a2 - 1.0 ) + 1.0;");
            src.push("   return 0.31830988618 * a2 / ( denom * denom);"); // 1/PI
            src.push("}");

            src.push(`vec3 ${name}(const in vec3 incidentLightDirection, const in vec3 viewNormal, const in vec3 viewEyeDir, const in vec3 specularColor, const in float roughness) {`);
            src.push("   float alpha = ( roughness * roughness );");
            src.push("   vec3 halfDir = normalize( incidentLightDirection + viewEyeDir );");
            src.push(`   float dotNL = ${saturate}( dot( viewNormal, incidentLightDirection ) );`);
            src.push(`   float dotNV = ${saturate}( dot( viewNormal, viewEyeDir ) );`);
            src.push(`   float dotNH = ${saturate}( dot( viewNormal, halfDir ) );`);
            src.push(`   float dotLH = ${saturate}( dot( incidentLightDirection, halfDir ) );`);
            src.push("   vec3  F = F_Schlick( specularColor, dotLH );");
            src.push("   float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );");
            src.push("   float D = D_GGX( alpha, dotNH );");
            src.push("   return F * (G * D);");
            src.push("}");
        });

    const BRDF_Specular_GGX_Environment = programVariables.createFragmentDefinition(
        "BRDF_Specular_GGX_Environment",
        (name, src) => {
            src.push(`vec3 ${name}(const in vec3 viewNormal, const in vec3 viewEyeDir, const in vec3 specularColor, const in float roughness) {`);
            src.push(`   float dotNV = ${saturate}(dot(viewNormal, viewEyeDir));`);
            src.push("   const vec4 c0 = vec4( -1, -0.0275, -0.572,  0.022);");
            src.push("   const vec4 c1 = vec4(  1,  0.0425,   1.04, -0.04);");
            src.push("   vec4 r = roughness * c0 + c1;");
            src.push("   float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;");
            src.push("   vec2 AB    = vec2(-1.04, 1.04) * a004 + r.zw;");
            src.push("   return specularColor * AB.x + AB.y;");
            src.push("}");
        });

    const perturbNormal2Arb = programVariables.createFragmentDefinition(
        "perturbNormal2Arb",
        (name, src) => {
            src.push(`vec3 ${name}( vec3 eye_pos, vec3 surf_norm, vec2 uv, vec4 texel ) {`);
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
        });

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
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord) => {
            const hasNonAmbientLighting = attributes.normal && ((lightSetup.directionalLights.length > 0) || lightSetup.getIrradiance || lightSetup.getReflection);
            src.push(`vec3 diffuseColor = ${(hasNonAmbientLighting && (phongMaterial || specularMaterial) && materialDiffuse) || (metallicMaterial && materialBaseColor) || "vec3(1.0)"};`);
            src.push(`vec4 alphaModeCutoff = ${((phongMaterial || metallicMaterial || specularMaterial) && materialAlphaModeCutoff) || "vec4(1.0, 0.0, 0.0, 0.0)"};`);
            src.push("float alpha = alphaModeCutoff[0];");
            (phongMaterial || metallicMaterial || specularMaterial) && alphaMap && src.push(`alpha *= ${alphaMap(texturePos)}.r;`);

            if (vColor) {
                src.push(`diffuseColor *= ${vColor}.rgb;`);
                src.push(`alpha *= ${vColor}.a;`);
            }
            if (metallicMaterial && baseColorMap) {
                src.push("vec4 baseColorTexel = " + baseColorMap(texturePos) + ";");
                src.push("diffuseColor *= baseColorTexel.rgb;");
                src.push("alpha *= baseColorTexel.a;");
            }
            if ((phongMaterial || specularMaterial) && diffuseMap) {
                src.push("vec4 diffuseTexel = " + diffuseMap(texturePos) + ";");
                src.push("diffuseColor *= diffuseTexel.rgb;");
                src.push("alpha *= diffuseTexel.a;");
            }

            src.push(`vec3 emissiveColor = ${((phongMaterial || metallicMaterial || specularMaterial) && materialEmissive) || "vec3(0.0)"};`);
            (phongMaterial || metallicMaterial || specularMaterial) && emissiveMap && src.push(`emissiveColor = ${emissiveMap(texturePos)}.rgb;`);

            if (hasNonAmbientLighting) {

                src.push(`vec3 specular    = ${((phongMaterial || specularMaterial) && materialSpecular)   || "vec3(1.0)"};`);
                src.push(`float glossiness = ${(specularMaterial && materialGlossiness) || "1.0"};`);
                src.push(`float metallic   = ${(metallicMaterial && materialMetallic)   || "1.0"};`);
                src.push(`float roughness  = ${((metallicMaterial || specularMaterial) && materialRoughness)  || "1.0"};`);
                src.push(`float shininess  = ${(phongMaterial && materialShininess)|| "1.0"};`);
                src.push(`float specularF0 = ${(metallicMaterial && materialSpecularF0) || "1.0"};`);
                src.push(`float occlusion  = ${((phongMaterial || metallicMaterial || specularMaterial) && occlusionMap) ? `${occlusionMap(texturePos)}.r` : "1.0"};`);

                //--------------------------------------------------------------------------------
                // SHADING
                //--------------------------------------------------------------------------------

                metallicMaterial && metallicMap  && src.push(`metallic  *= ${metallicMap(texturePos)}.r;`);
                metallicMaterial && roughnessMap && src.push(`roughness *= ${roughnessMap(texturePos)}.r;`);

                if (metallicMaterial && metallicRoughnessMap) {
                    src.push("vec4 metalRoughTexel = " + metallicRoughnessMap(texturePos) + ";");
                    src.push("metallic  *= metalRoughTexel.b;");
                    src.push("roughness *= metalRoughTexel.g;");
                }

                (phongMaterial || specularMaterial) && specularMap && src.push(`specular *= ${specularMap(texturePos)}.rgb;`);
                specularMaterial && glossinessMap && src.push(`glossiness *= ${glossinessMap(texturePos)}.r;`);

                if (specularMaterial && specularGlossinessMap) {
                    src.push("vec4 specGlossTexel = " + specularGlossinessMap(texturePos) + ";"); // TODO: what if only RGB texture?
                    src.push("specular   *= specGlossTexel.rgb;");
                    src.push("glossiness *= specGlossTexel.a;");
                }

                const vViewNormalized = `normalize(${vViewNormal})`;
                const viewNormal = (((phongMaterial || metallicMaterial || specularMaterial) && normalMap)
                                    ? `${perturbNormal2Arb}(${vViewPosition}, ${vViewNormalized}, ${normalMap.getTexCoordExpression(texturePos)}, ${normalMap(texturePos)})`
                                    : vViewNormalized);
                src.push(`vec3 viewNormal = ${viewNormal};`);

                src.push(`vec3 viewEyeDir = normalize(-${vViewPosition});`);

                diffuseFresnel  && src.push(`diffuseColor  *= ${diffuseFresnel ("viewEyeDir", "viewNormal")};`);
                specularFresnel && src.push(`specular      *= ${specularFresnel("viewEyeDir", "viewNormal")};`);
                emissiveFresnel && src.push(`emissiveColor *= ${emissiveFresnel("viewEyeDir", "viewNormal")};`);
                alphaFresnel    && src.push(`alpha         *= ${alphaFresnel   ("viewEyeDir", "viewNormal")};`);

                src.push("if (alphaModeCutoff[1] == 1.0 && alpha < alphaModeCutoff[2]) {"); // ie. (alphaMode == "mask" && alpha < alphaCutoff)
                src.push("   discard;"); // TODO: Discard earlier within this shader?
                src.push("}");

                src.push("vec3 material_diffuseColor;");

                if (phongMaterial) {
                    src.push("material_diffuseColor = diffuseColor;");
                    src.push("roughness = 0.0;");
                }

                if (specularMaterial) {
                    src.push("float oneMinusSpecularStrength = 1.0 - max(max(specular.r, specular.g ),specular.b);"); // Energy conservation
                    src.push("material_diffuseColor = diffuseColor * oneMinusSpecularStrength;");
                    src.push("roughness = clamp(1.0 - glossiness, 0.04, 1.0);");
                }

                if (metallicMaterial) {
                    src.push("float dielectricSpecular = 0.16 * specularF0 * specularF0;");
                    src.push("material_diffuseColor = diffuseColor * (1.0 - dielectricSpecular) * (1.0 - metallic);");
                    src.push("roughness = clamp(roughness, 0.04, 1.0);");
                    src.push("specular = mix(vec3(dielectricSpecular), diffuseColor, metallic);");
                }

                // ENVIRONMENT AND REFLECTION MAP SHADING

                if (phongMaterial || metallicMaterial || specularMaterial) {
                    src.push("const float PI = 3.14159265359;");
                    src.push("vec3 reflDiff = vec3(0.0);");
                    src.push("vec3 reflSpec = vec3(0.0);");

                    lightSetup.getIrradiance && src.push(`reflDiff += ${lightSetup.getIrradiance(`normalize(${vWorldNormal})`)};`);

                    if (lightSetup.getReflection) {
                        const reflectVec = `reflect(-viewEyeDir, viewNormal)`;
                        const spec = (phongMaterial
                                      ? `0.2 * PI * ${lightSetup.getReflection(reflectVec)}`
                                      : (function() {
                                          const blinnExpFromRoughness = `2.0 / pow(roughness + 0.0001, 2.0) - 2.0`;
                                          const specularBRDFContrib = `${BRDF_Specular_GGX_Environment}(viewNormal, viewEyeDir, specular, roughness)`;

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
                        src.push(`vec3 lightDirection${i} = ${light.isViewSpace ? light.getDirection(null, vViewPosition) : vDirectionals[i].vViewLightReverseDir};`);
                        const dotNL = `${saturate}(dot(viewNormal, lightDirection${i}))`;
                        src.push(`vec3 irradiance${i} = ${dotNL} * lightColor${i};`);
                        src.push(`reflDiff += irradiance${i};`);
                        const spec = (phongMaterial
                                      ? `lightColor${i} * specular * pow(max(dot(reflect(-lightDirection${i}, -viewNormal), viewEyeDir), 0.0), shininess)`
                                      : `irradiance${i} * PI * ${BRDF_Specular_GGX}(lightDirection${i}, viewNormal, viewEyeDir, specular, roughness)`);
                        src.push(`reflSpec += ${spec};`);
                    });
                }

                const ambient = phongMaterial && `${lightSetup.getAmbientColor()} * diffuseColor`;
                src.push("vec3 outgoingLight = emissiveColor + occlusion * (reflDiff * material_diffuseColor + reflSpec)" + (ambient ? (" + " + ambient) : "") + ";");
            } else {
                src.push(`vec3 ambientColor = ${(phongMaterial && materialAmbient) || "vec3(1.0)"};`);
                phongMaterial && ambientMap && src.push(`ambientColor *= ${ambientMap(texturePos)}.rgb;`);
                src.push(`ambientColor *= ${lightSetup.getAmbientColor()};`);
                src.push("vec3 outgoingLight = emissiveColor + ambientColor;");
            }

            src.push(`vec4 fragColor = ${colorize} * vec4(outgoingLight, alpha);`);

            src.push(`${outColor} = ${getGammaOutputExpression ? getGammaOutputExpression("fragColor") : "fragColor"};`);
        }
    };
};
