const vertexLight = `#version 300 es

#define MAX_POINT_LIGHTS 14 

layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec2 aTexCoord;
layout (location = 2) in vec3 aNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

uniform vec3 uCameraPosition;

struct Material {
    float diffuse;
    float specular;
    float shininess;
};

uniform vec3 u_lightColor[MAX_POINT_LIGHTS];
uniform vec3 u_lightPosition[MAX_POINT_LIGHTS];
uniform vec3 u_lightAttenuation[MAX_POINT_LIGHTS];

uniform Material uMaterial;

out vec2 vTexCoord;
out vec3 vDiffuseLight;
out vec3 vSpecularLight;

void main() {
    for (int i = 0; i < MAX_POINT_LIGHTS; i++) {

        vec3 surfacePosition = (uModelMatrix * vec4(aPosition, 1)).xyz;

        float d = distance(u_lightPosition[i], surfacePosition);
        float attenuation = 1.0 / dot(u_lightAttenuation[i], vec3(1, d, d * d));

        vec3 N = normalize(mat3(uModelMatrix) * aNormal);
        vec3 L = normalize(surfacePosition- u_lightPosition[i]);
        vec3 E = normalize(uCameraPosition - surfacePosition);
        vec3 R = normalize(reflect(L, N));

        float lambert = max(0.0, dot(L, N)) * uMaterial.diffuse;
        float phong = pow(max(0.0, dot(E, R)), uMaterial.shininess) * uMaterial.specular;

        vDiffuseLight += lambert * attenuation * u_lightColor[i];
        // better without too much specular
        vSpecularLight = phong * attenuation * u_lightColor[i];

        vTexCoord = aTexCoord;
        gl_Position = uProjectionMatrix * (uViewMatrix * vec4(surfacePosition, 1));
    }
}
`;

const fragmentLight = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;
in vec3 vDiffuseLight;
in vec3 vSpecularLight;

out vec4 oColor;

void main() {
    const float gamma = 2.0;
    vec3 albedo = pow(texture(uTexture, vTexCoord).rgb, vec3(gamma));
    vec3 finalColor = albedo * vDiffuseLight + vSpecularLight;
    oColor = pow(vec4(finalColor, 1), vec4(1.0 / gamma));
}
`;


const vertex = `#version 300 es
layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec2 aTexCoord;

uniform mat4 uViewModel;
uniform mat4 uProjection;

out vec2 vTexCoord;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjection * uViewModel * aPosition;
}
`;

const fragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;

out vec4 oColor;

void main() {
    oColor = texture(uTexture, vTexCoord);
}
`;




export const shaders = {
    light:  { vertex: vertexLight, fragment: fragmentLight},
    simple: { vertex: vertex, fragment: fragment}
};
