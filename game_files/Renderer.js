import { vec3, mat4 } from '../../lib/gl-matrix-module.js';

import { WebGL } from '../../common/engine/WebGL.js';

import { shaders } from './shaders.js';
import { Camera } from './Camera.js';
import { Cube } from './Cube.js';

export class Renderer {

    constructor(gl) {
        this.gl = gl;

        gl.clearColor(1, 1, 1, 1);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        this.programs = WebGL.buildPrograms(gl, shaders);
    }

    prepare(scene) {
        this.color = [  1.0, 0.5, 0.1,      // Orange 1 Light
                        0.1, 1.0, 0.2,      // Green 1 Light
                        1.0, 0.5, 0.1,      // Orange 2 Light 
                        0.1, 1.0, 0.2,      // Green 2 Light
                        1.0, 0.5, 0.1,      // Orange 1 Light
                        0.1, 1.0, 0.2,      // Green 1 Light
                        1.0, 0.5, 0.1,      // Orange 2 Light 
                        0.1, 1.0, 0.2,      // Green 2 Light
                        0.8, 0.8, 1.0,      // Down Light
                        1.0, 1.0, 1.0,      // Up Light
                       
                        1.0, 1.0, 1.0,      // Corner white lights
                        1.0, 1.0, 1.0,      //
                        1.0, 1.0, 1.0,      //
                        1.0, 1.0, 1.0 ];    //

        this.attenuation = [0.1, 0, 0.5, 
                            0.1, 0, 0.5,
                            0.1, 0, 0.5,
                            0.1, 0, 0.5,    
                            0.1, 0, 0.5,
                            0.1, 0, 0.5,
                            0.1, 0, 0.5,
                            0.1, 0, 0.5,    
                            0.1, 0, 0.5,
                            0.1, 0, 0.5,
                        
                            0.1, 0, 0.9,
                            0.1, 0, 0.9,    
                            0.1, 0, 0.9,
                            0.1, 0, 0.9]

        this.position = [   -6, 2.0, -8.5, 
                            6, 2.0, -8.5, 
                            6, 5.0, 8.5, 
                            -6, 5.0, 8.5,
                            -4, 2.0, -8.5, 
                            4, 2.0, -8.5, 
                            4, 5.0, 8.5, 
                            -4, 5.0, 8.5, 

                            0.0, -5.0, 0.0,
                            0.0, 15.0, 0.0,

                            9.0, 2.0, 9.0, 
                            -9.0, 2.0, 9.0, 
                            9.0, 2.0, -9.0, 
                            -9.0, 2.0, -9.0]

        scene.nodes.forEach(node => {
            node.gl = {};
            if (node.mesh) {
                Object.assign(node.gl, this.createModel(node.mesh));
            }
            if (node.image) {
                node.gl.texture = this.createTexture(node.image);
            }
        });

    }

    render(scene, camera) {

        const gl = this.gl;

        const matrix = mat4.create();
        const matrixStack = [];
        const viewMatrix = camera.getGlobalTransform();
        mat4.invert(viewMatrix, viewMatrix);
        mat4.copy(matrix, viewMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const { program, uniforms } = this.programs.light;
        gl.useProgram(program);
        
        //
        // Uniforms for light:
        gl.uniformMatrix4fv(uniforms.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, camera.projection);
        gl.uniform3fv(uniforms.uCameraPosition,
            mat4.getTranslation(vec3.create(), camera.getGlobalTransform()));

        const colorLocation = gl.getUniformLocation(program, "u_lightColor");      
        gl.uniform3fv(colorLocation, this.color);

        const positionLocation = gl.getUniformLocation(program, "u_lightPosition");            
        gl.uniform3fv(positionLocation, this.position);

        const attenuationLocation = gl.getUniformLocation(program, "u_lightAttenuation");            
        gl.uniform3fv(attenuationLocation, this.attenuation);
        //
    
        scene.traverse(
            node => {
                matrixStack.push(mat4.clone(matrix));
                mat4.mul(matrix, matrix, node.matrix);

                const { uniforms } = this.programs.light;


                if (node.material) {
                    if(node instanceof Cube){
                        node.material.shininess = 100;
                    }  
                    gl.bindVertexArray(node.gl.vao);

                    gl.uniformMatrix4fv(uniforms.uModelMatrix, false, node.getGlobalTransform());

                    gl.activeTexture(gl.TEXTURE0);
                    gl.uniform1i(uniforms.uTexture, 0);
                    gl.bindTexture(gl.TEXTURE_2D, node.gl.texture);
                    if(node.scale[2] < 0.05){
                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, new Image());
                        gl.generateMipmap(gl.TEXTURE_2D);
                    }

                    // Material uniforms:
                    gl.uniform1f(uniforms.uMaterial.diffuse, node.material.diffuse);
                    gl.uniform1f(uniforms.uMaterial.specular, node.material.specular);
                    gl.uniform1f(uniforms.uMaterial.shininess, node.material.shininess);

                    gl.drawElements(gl.TRIANGLES, node.gl.indices, gl.UNSIGNED_SHORT, 0);
                }                
            },
            node => {
                mat4.copy(matrix, matrixStack.pop());
            }
        );

        
        
        ///--------------------------------------------------------------------------------------------------------------------
        
    }


    createModel(model) {
        const gl = this.gl;

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texcoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

        const indices = model.indices.length;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);

        return { vao, indices };
    }

    createTexture(texture) {
        const gl = this.gl;
        return WebGL.createTexture(gl, {
            image : texture,
            min   : gl.NEAREST,
            mag   : gl.NEAREST
        });
    }

}
