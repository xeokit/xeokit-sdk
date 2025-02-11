import {setup2dTexture} from "../LayerRenderer.js";

export const PBRProgram = function(geometryParameters, scene, lightSetup, sao) {
    const getIrradiance = lightSetup.getIrradiance;
    const getReflectionRadiance = lightSetup.getReflectionRadiance;
    const gammaOutput = scene.gammaOutput; // If set, then it expects that all textures and colors need to be outputted in premultiplied gamma. Default is false.

    const colorMap         = setup2dTexture("uColorMap",         textureSet => textureSet.colorTexture);
    const metallicRoughMap = setup2dTexture("uMetallicRoughMap", textureSet => textureSet.metallicRoughnessTexture);
    const emissiveMap      = setup2dTexture("uEmissiveMap",      textureSet => textureSet.emissiveTexture);
    const normalMap        = setup2dTexture("uNormalMap",        textureSet => textureSet.normalsTexture);
    const aOMap            = setup2dTexture("uAOMap",            textureSet => textureSet.occlusionTexture);

    const textures = [ colorMap, metallicRoughMap, emissiveMap, normalMap, aOMap ];

    return {
        programName: "PBR",
        getHash: () => [lightSetup.getHash(), sao ? "sao" : "nosao", gammaOutput],
        getLogDepth: scene.logarithmicDepthBufferEnabled && (vFragDepth => vFragDepth),
        renderPassFlag: 0,      // COLOR_OPAQUE | COLOR_TRANSPARENT
        appendVertexDefinitions: (src) => {
            src.push("out vec4 vViewPosition;");
            src.push("out vec3 vViewNormal;");
            src.push("out vec4 vColor;");
            src.push("out vec2 vUV;");
            src.push("out vec2 vMetallicRoughness;");

            if (getIrradiance) {
                src.push("out vec3 vWorldNormal;");
            }
        },
        appendVertexOutputs: (src) => {
            src.push(`vViewPosition = ${geometryParameters.attributes.position.view};`);
            src.push(`vViewNormal = ${geometryParameters.attributes.normal.view};`);
            src.push(`vColor = ${geometryParameters.attributes.color};`);
            src.push(`vUV = ${geometryParameters.attributes.uv};`);
            src.push(`vMetallicRoughness = ${geometryParameters.attributes.metallicRoughness};`);

            if (getIrradiance) {
                src.push(`vWorldNormal = ${geometryParameters.attributes.normal.world}.xyz;`);
            }
        },
        appendFragmentDefinitions: (src) => {
            textures.forEach(t => t.appendDefinitions(src));
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
            src.push(`       vec3 texel = ${normalMap.getValueExpression("uv")}.xyz;`);
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
        appendFragmentOutputs: (src, vWorldPosition, gl_FragCoord, sliceColorOr) => {
            src.push("IncidentLight  light;");
            src.push("Material       material;");
            src.push("Geometry       geometry;");
            src.push("ReflectedLight reflectedLight = ReflectedLight(vec3(0.0,0.0,0.0), vec3(0.0,0.0,0.0));");

            src.push("vec3 rgb = vColor.rgb;");
            src.push("float opacity = vColor.a;");

            src.push("vec3  baseColor = rgb;");
            src.push("float specularF0 = 1.0;");
            src.push("float metallic = float(vMetallicRoughness.r) / 255.0;");
            src.push("float roughness = float(vMetallicRoughness.g) / 255.0;");
            src.push("float dielectricSpecular = 0.16 * specularF0 * specularF0;");

            src.push(`vec4 colorTexel = sRGBToLinearPBR(${colorMap.getValueExpression("vUV")});`);
            src.push("baseColor *= colorTexel.rgb;");
            // src.push("opacity *=/= colorTexel.a;"); // batching had "*=", instancing had "="

            src.push(`vec3 metalRoughTexel = ${metallicRoughMap.getValueExpression("vUV")}.rgb;`);
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

            const viewMatrix = geometryParameters.viewMatrix;
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

            src.push(`vec3 emissiveColor = sRGBToLinearPBR(${emissiveMap.getValueExpression("vUV")}).rgb;`); // TODO: correct gamma function
            src.push(`float aoFactor = ${aOMap.getValueExpression("vUV")}.r;`);

            src.push("vec3 outgoingLight = (" + lightSetup.getAmbientColor() + " * baseColor * opacity * rgb) + (reflectedLight.diffuse) + (reflectedLight.specular) + emissiveColor;");

            src.push("outColor = vec4(outgoingLight * aoFactor" + (sao ? ` * ${sao.getAmbient(gl_FragCoord)}` : "") + ", opacity);");

            if (gammaOutput) {
                src.push("outColor = linearToGamma(outColor);");
            }
        },
        setupInputs: (getUniformSetter) => {
            const textureSetters       = textures.map(t => t.setupInputs(getUniformSetter));
            const uGammaFactor         = gammaOutput && getUniformSetter("gammaFactor");
            const setLightsRenderState = lightSetup.setupInputs(getUniformSetter);
            const setSAOState          = sao && sao.setupInputs(getUniformSetter);
            return (frameCtx, textureSet) => {
                textureSet && textureSetters.forEach(s => s(textureSet, frameCtx));
                uGammaFactor && uGammaFactor(scene.gammaFactor);
                setLightsRenderState(frameCtx);
                setSAOState && setSAOState(frameCtx);
            };
        },

        clippingCaps: scene._sectionPlanesState.clippingCaps && "outColor",
        incrementDrawState: true
    };
};
