import {LinearEncoding, sRGBEncoding} from "../../../constants/constants.js";
import {setupTexture} from "../../../webgl/WebGLRenderer.js";

export const PBRProgram = function(programVariables, geometry, scene, lightSetup, sao) {
    const setup2dTexture = (name, isSrgb, getTexture) => {
        return setupTexture(programVariables, "sampler2D", name, isSrgb ? sRGBEncoding : LinearEncoding, (set, state) => {
            const texture = getTexture(state.layerTextureSet);
            texture && set(texture.texture);
        });
    };

    const attributes = geometry.attributes;
    const getIrradiance = lightSetup.getIrradiance;

    const colorMap         = setup2dTexture("uColorMap",         true,  textureSet => textureSet.colorTexture);
    const metallicRoughMap = setup2dTexture("uMetallicRoughMap", false, textureSet => textureSet.metallicRoughnessTexture);
    const emissiveMap      = setup2dTexture("uEmissiveMap",      true,  textureSet => textureSet.emissiveTexture);
    const normalMap        = setup2dTexture("uNormalMap",        false, textureSet => textureSet.normalsTexture);
    const aOMap            = setup2dTexture("uAOMap",            false, textureSet => textureSet.occlusionTexture);

    const vViewPosition      = programVariables.createVarying("vec3", "vViewPosition",      () => `${attributes.position.view}.xyz`);
    const vViewNormal        = programVariables.createVarying("vec3", "vViewNormal",        () => attributes.normal.view);
    const vColor             = programVariables.createVarying("vec4", "vColor",             () => attributes.color);
    const vUV                = programVariables.createVarying("vec2", "vUV",                () => attributes.uv);
    const vMetallicRoughness = programVariables.createVarying("vec2", "vMetallicRoughness", () => attributes.metallicRoughness);
    const vWorldNormal       = programVariables.createVarying("vec3", "vWorldNormal",       () => `${attributes.normal.world}.xyz`);

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
            src.push("      if (texel.r == 0.0 && texel.g == 0.0 && texel.b == 0.0) {");
            src.push("             return surf_norm;");
            src.push("      }");
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
        programName: "PBR",
        getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao", !!scene.gammaOutput],
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,      // COLOR_OPAQUE | COLOR_TRANSPARENT
        clippingCaps: scene._sectionPlanesState.clippingCaps && outColor,
        incrementDrawState: true,
        appendFragmentOutputs: (src, getGammaOutputExpression, gl_FragCoord) => {
            src.push("const float PI = 3.14159265359;");
            src.push("vec3 reflDiff = vec3(0.0);");
            src.push("vec3 reflSpec = vec3(0.0);");

            src.push(`vec3 rgb = ${vColor}.rgb;`);
            src.push(`float opacity = ${vColor}.a;`);

            src.push("vec3  baseColor  = rgb;");
            src.push("float specularF0 = 1.0;");
            src.push(`float metallic   = float(${vMetallicRoughness}.r) / 255.0;`);
            src.push(`float roughness  = float(${vMetallicRoughness}.g) / 255.0;`);
            src.push("float dielectricSpecular = 0.16 * specularF0 * specularF0;");

            src.push(`vec4 colorTexel = ${colorMap(vUV)};`);
            src.push("baseColor *= colorTexel.rgb;");
            // src.push("opacity *=/= colorTexel.a;"); // batching had "*=", instancing had "="

            src.push(`vec3 metalRoughTexel = ${metallicRoughMap(vUV)}.rgb;`);
            src.push("metallic *= metalRoughTexel.b;");
            src.push("roughness *= metalRoughTexel.g;");

            src.push("vec3 diffuseColor       = baseColor * (1.0 - dielectricSpecular) * (1.0 - metallic);");
            src.push("float specularRoughness = clamp(roughness, 0.04, 1.0);");
            src.push("vec3 specularColor      = mix(vec3(dielectricSpecular), baseColor, metallic);");

            src.push(`vec3 viewNormal = -${perturbNormal2Arb}(${vViewPosition}, normalize(${vViewNormal}), ${vUV}, ${normalMap(vUV)});`);
            src.push(`vec3 viewEyeDir = normalize(${vViewPosition});`);

            getIrradiance && src.push(`reflDiff += ${getIrradiance(`normalize(${vWorldNormal})`)};`);

            if (lightSetup.getReflection) {
                const reflectVec = `reflect(viewEyeDir, viewNormal)`;
                const viewReflectVec = `normalize((vec4(${reflectVec}, 0.0) * ${geometry.viewMatrix}).xyz)`;
                const maxMIPLevel = "8.0";
                const blinnExpFromRoughness = `(2.0 / pow(specularRoughness + 0.0001, 2.0) - 2.0)`;
                const desiredMIPLevel = `${maxMIPLevel} - 0.79248 - 0.5 * log2(pow(${blinnExpFromRoughness}, 2.0) + 1.0)`;
                const specularMIPLevel = `0.5 * clamp(${desiredMIPLevel}, 0.0, ${maxMIPLevel})`; // TODO: a random factor - fix this
                const radiance = lightSetup.getReflection(viewReflectVec, specularMIPLevel);
                const specularBRDFContrib = `${BRDF_Specular_GGX_Environment}(viewNormal, viewEyeDir, specularColor, specularRoughness)`;
                src.push(`reflSpec += ${radiance} * ${specularBRDFContrib};`);
            }

            lightSetup.directionalLights.forEach((light, i) => {
                src.push(`vec3 lightDirection${i} = -${light.getDirection(geometry.viewMatrix, vViewPosition)};`); // This "-" might be wrong, but it used to be like that
                const dotNL = `${saturate}(dot(viewNormal, lightDirection${i}))`;
                src.push(`vec3 irradiance${i} = ${dotNL} * ${light.getColor()};`);
                src.push(`reflDiff += irradiance${i};`);
                src.push(`reflSpec += irradiance${i} * PI * ${BRDF_Specular_GGX}(lightDirection${i}, viewNormal, viewEyeDir, specularColor, specularRoughness);`);
            });

            src.push(`vec3 emissiveColor = ${emissiveMap(vUV)}.rgb;`); // TODO: correct gamma function
            src.push(`float aoFactor = ${aOMap(vUV)}.r;`);

            const ambient = `${lightSetup.getAmbientColor()} * baseColor * opacity * rgb`;
            src.push(`vec3 outgoingLight = emissiveColor + reflDiff * diffuseColor + reflSpec + ${ambient};`);

            src.push(`${outColor} = vec4(outgoingLight * aoFactor${sao ? ` * ${sao.getAmbient(gl_FragCoord)}` : ""}, opacity);`);

            getGammaOutputExpression && src.push(`${outColor} = ${getGammaOutputExpression(outColor)};`);
        }
    };
};
