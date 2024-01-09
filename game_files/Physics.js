import { vec3, mat4 } from '../../lib/gl-matrix-module.js';
import { Camera } from './Camera.js';
import { Cube } from './Cube.js';

export class Physics {

    constructor(scene) {
        this.scene = scene;
        this.teleportSound = document.createElement("audio");
        this.teleportSound.src = "../../common/sounds/swoosh.mp3";
        this.gameOverMessage = document.getElementById('gameover');
    }

    cooldown = 0;

    update(dt) {
        this.scene.traverse(node => {
            // Move every node with defined velocity.
            if (node.movable) {

                vec3.scaleAndAdd(node.translation, node.translation, node.velocity, dt);
                if(node instanceof Camera){
                    vec3.scaleAndAdd(node.translation, node.translation, node.gravity, dt);
                }
                node.updateMatrix();

                // After moving, check for collision with every other node.
                this.scene.traverse(other => {
                    if (node !== other) {
                        this.resolveCollision(node, other);
                    }
                });
            }
        });

        this.cooldown -= dt;
        
    }

    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    getTransformedAABB(node) {
        // Transform all vertices of the AABB from local to global space.
        const transform = node.getGlobalTransform();
        const { min, max } = node.aabb;
        const vertices = [
            [min[0], min[1], min[2]],
            [min[0], min[1], max[2]],
            [min[0], max[1], min[2]],
            [min[0], max[1], max[2]],
            [max[0], min[1], min[2]],
            [max[0], min[1], max[2]],
            [max[0], max[1], min[2]],
            [max[0], max[1], max[2]],
        ].map(v => vec3.transformMat4(v, v, transform));

        // Find new min and max by component.
        const xs = vertices.map(v => v[0]);
        const ys = vertices.map(v => v[1]);
        const zs = vertices.map(v => v[2]);
        const newmin = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
        const newmax = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
        return { min: newmin, max: newmax };
    }

    resolveCollision(a, b) {
        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return;
        }

        // Move node A minimally to avoid collision.
        const diffa = vec3.sub(vec3.create(), bBox.max, aBox.min);
        const diffb = vec3.sub(vec3.create(), aBox.max, bBox.min);

        let minDiff = Infinity;
        let minDirection = [0, 0, 0];
        if (diffa[0] >= 0 && diffa[0] < minDiff) {
            minDiff = diffa[0];
            minDirection = [minDiff, 0, 0];
        }
        if (diffa[1] >= 0 && diffa[1] < minDiff) {
            minDiff = diffa[1];
            minDirection = [0, minDiff, 0];
        }
        if (diffa[2] >= 0 && diffa[2] < minDiff) {
            minDiff = diffa[2];
            minDirection = [0, 0, minDiff];
        }
        if (diffb[0] >= 0 && diffb[0] < minDiff) {
            minDiff = diffb[0];
            minDirection = [-minDiff, 0, 0];
        }
        if (diffb[1] >= 0 && diffb[1] < minDiff) {
            minDiff = diffb[1];
            minDirection = [0, -minDiff, 0];
        }
        if (diffb[2] >= 0 && diffb[2] < minDiff) {
            minDiff = diffb[2];
            minDirection = [0, 0, -minDiff];
        }
        
        // Check if the player is colliding on the Y axis (ground)
        // and set the .grounded atribute to 1, so it can jump again (in the Camera script)
        if (minDirection[1] != 0) {
            if(a instanceof Camera){
                a.grounded = 1;
                a.jumpFrames = 20;
            }
        }

        // Teleporting if collision is detected
        // Collision with portal if its scaled smaller than a box
        if (a.velocity && b.scale[2] < 0.05 && this.cooldown <= 0) {

            // Teleportation sound
            this.teleportSound.currentTime = 0;
            this.teleportSound.play();

        //Teleport
            // Teleporting cubes
            if(a instanceof Cube){
                if (a.translation[0] < 0 && a.translation[2] < 0)
                    {a.translation = [5, 4, 8]}
                else if (a.translation[0] > 0 && a.translation[2] < 0)
                    {a.translation = [-5, 4, 8]}
                else if (a.translation[0] < 0 && a.translation[2] > 0)
                    {a.translation = [5, 1, -8]}
                else if (a.translation[0] > 0 && a.translation[2] > 0)
                    {a.translation = [-5, 1, -8]}
            }
            // Teleporting player
            else{
                if (a.translation[0] < -7){
                    a.translation = [0, 20, 0];
                    a.rotation = [-1.5, 0, 0];
                    a.movable = 0;
                    // Game Over message
                    this.gameOverMessage.style.display = 'block';
                }
                else if (a.translation[0] < 0 && a.translation[2] < 0)
                    {a.translation = [5, 4, 8.5]}
                else if (a.translation[0] > 0 && a.translation[2] < 0)
                    {a.translation = [-5, 4, 8.5]}
                else if (a.translation[0] < 0 && a.translation[2] > 0)
                    {a.translation = [5, 1, -8.5]}
                else if (a.translation[0] > 0 && a.translation[2] > 0)
                    {a.translation = [-5, 1, -8.5]}
            }
            
            this.cooldown = 0.5;
            console.log("Teleported");
        }

        // Moving the minimum distance to avoid collision
        vec3.add(a.translation, a.translation, minDirection);

        // Moving the box in the opposite direction for pushing effect
        if (b instanceof Cube){
            if (a instanceof Camera){
                vec3.scale(minDirection,minDirection,7);
            }
            vec3.add(b.velocity, b.velocity, vec3.negate(minDirection,minDirection));
        }
        a.updateMatrix();
    }

}
