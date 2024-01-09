import { Application } from '../../common/engine/Application.js';

import { Renderer } from './Renderer.js';
import { Physics } from './Physics.js';
import { Camera } from './Camera.js';
import { Cube } from './Cube.js';
import { SceneLoader } from './SceneLoader.js';
import { SceneBuilder } from './SceneBuilder.js';
import { Material } from './Material.js';


class App extends Application {

    async start() {
        const gl = this.gl;

        this.renderer = new Renderer(gl);
        this.time = performance.now();
        this.startTime = this.time;
        this.aspect = 1;

        await this.load('scene.json');

        this.backgroundSound = document.createElement("audio");
        this.backgroundSound.src = "../../common/sounds/background.mp3";
        this.backgroundSound.loop = true;
        this.backgroundSound.volume = 0.3;

        var pauseMessage = document.getElementById('message');

        this.canvas.addEventListener('click', e => this.canvas.requestPointerLock());
        document.addEventListener('pointerlockchange', e => {
            if (document.pointerLockElement === this.canvas) {
                this.camera.enable();
                this.backgroundSound.play();
                pauseMessage.style.display = 'none';
            } else {
                this.camera.disable();
                this.backgroundSound.pause();
                pauseMessage.style.display = 'block';
            }
        });
    }

    async load(uri) {
        const scene = await new SceneLoader().loadScene(uri);
        const builder = new SceneBuilder(scene);
        this.scene = builder.build();
        this.physics = new Physics(this.scene);

        // Find first camera.
        this.camera = null;
        this.scene.traverse(node => {
            if (node instanceof Camera) {
                this.camera = node;
            }
        });

        // Find all the movable cubes
        this.cubes = [];
        this.scene.traverse(node => {
            if (node instanceof Cube) {
                this.cubes.push(node);
            }
        });

        // Setting the material
        this.scene.traverse(node => {
            node.material = new Material();
        });

        this.camera.aspect = this.aspect;
        this.camera.updateProjection();
        this.renderer.prepare(this.scene);
    }

    update() {
        const t = this.time = performance.now();
        const dt = (this.time - this.startTime) * 0.001;
        this.startTime = this.time;

        this.camera.update(dt);
        this.physics.update(dt);
        this.cubes.forEach(cube => {
            cube.update(dt);
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.aspect = w / h;
        if (this.camera) {
            this.camera.aspect = this.aspect;
            this.camera.updateProjection();
        }
    }

}

const canvas = document.querySelector('canvas');
const app = new App(canvas);
await app.init();
document.querySelector('.loader-container').remove();
