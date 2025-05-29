//CAMPFIRE SCENE
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

const _VS = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 colour;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  vAngle = vec2(cos(angle), sin(angle));
  vColour = colour;
}`;

const _FS = `
uniform sampler2D diffuseTexture;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
}`;

class LinearSpline {
  constructor(lerp) {
    this._points = [];
    this._lerp = lerp;
  }

  AddPoint(t, d) {
    this._points.push([t, d]);
  }

  Get(t) {
    let p1 = 0;

    for (let i = 0; i < this._points.length; i++) {
      if (this._points[i][0] >= t) {
        break;
      }
      p1 = i;
    }

    const p2 = Math.min(this._points.length - 1, p1 + 1);

    if (p1 == p2) {
      return this._points[p1][1];
    }

    return this._lerp(
        (t - this._points[p1][0]) / (
            this._points[p2][0] - this._points[p1][0]),
        this._points[p1][1], this._points[p2][1]);
  }
}

class ParticleSystem {
  constructor(params) {
    const uniforms = {
      diffuseTexture: {
        value: new THREE.TextureLoader().load('./resources/fire.png')
      },
      pointMultiplier: {
        value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
      }
    };

    this._material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    this._camera = params.camera;
    this._particles = [];
    this._campfire = params.campfire;

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    this._geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
    this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute([], 4));
    this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));

    this._points = new THREE.Points(this._geometry, this._material);
    params.parent.add(this._points);

    this._alphaSpline = new LinearSpline((t, a, b) => {
      return a + t * (b - a);
    });
    this._alphaSpline.AddPoint(0.0, 0.0);
    this._alphaSpline.AddPoint(0.1, 1.0);
    this._alphaSpline.AddPoint(0.6, 1.0);
    this._alphaSpline.AddPoint(1.0, 0.0);

    this._colourSpline = new LinearSpline((t, a, b) => {
      const c = a.clone();
      return c.lerp(b, t);
    });
    this._colourSpline.AddPoint(0.0, new THREE.Color(0xFFFF80));
    this._colourSpline.AddPoint(1.0, new THREE.Color(0xFF8080));

    this._sizeSpline = new LinearSpline((t, a, b) => {
      return a + t * (b - a);
    });
    this._sizeSpline.AddPoint(0.0, 1.0);
    this._sizeSpline.AddPoint(0.5, 3.0);
    this._sizeSpline.AddPoint(1.0, 1.0);

    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);

    this._UpdateGeometry();
  }

  _onKeyUp(event) {
    switch(event.keyCode) {
      case 32: // SPACE
        this._AddParticles();
        break;
    }
  }

  _AddParticles(timeElapsed) {
    if (!this.gdfsghk) {
      this.gdfsghk = 0.0;
    }
    this.gdfsghk += timeElapsed;
    const n = Math.floor(this.gdfsghk * 75.0);
    this.gdfsghk -= n / 75.0;

    for (let i = 0; i < n; i++) {
      const life = (Math.random() * 0.5 + 0.25) * 1.5;
      this._particles.push({
          position: new THREE.Vector3(
              (Math.random() * 2 - 1) * 0.3,
              Math.random() * 0.2,
              (Math.random() * 2 - 1) * 0.3),
          size: (Math.random() * 0.5 + 0.5) * 3.0,
          colour: new THREE.Color(),
          alpha: 1.0,
          life: life,
          maxLife: life,
          rotation: Math.random() * 2.0 * Math.PI,
          velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.2,
              (Math.random() * 1.5 + 2.0),
              (Math.random() - 0.5) * 0.2
          ),
      });
    }
  }

  _UpdateGeometry() {
    const positions = [];
    const sizes = [];
    const colours = [];
    const angles = [];

    for (let p of this._particles) {
      const particlePos = p.position.clone();
      if (this._campfire) {
        particlePos.add(this._campfire.position);
      }
      positions.push(particlePos.x, particlePos.y, particlePos.z);
      colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
      sizes.push(p.currentSize);
      angles.push(p.rotation);
    }

    this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this._geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute(colours, 4));
    this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute(angles, 1));

    this._geometry.attributes.position.needsUpdate = true;
    this._geometry.attributes.size.needsUpdate = true;
    this._geometry.attributes.colour.needsUpdate = true;
    this._geometry.attributes.angle.needsUpdate = true;
  }

  _UpdateParticles(timeElapsed) {
    for (let p of this._particles) {
      p.life -= timeElapsed;
    }

    this._particles = this._particles.filter(p => {
      return p.life > 0.0;
    });

    for (let p of this._particles) {
      const t = 1.0 - p.life / p.maxLife;

      p.rotation += timeElapsed * 0.5;
      p.alpha = this._alphaSpline.Get(t);
      p.currentSize = p.size * this._sizeSpline.Get(t);
      p.colour.copy(this._colourSpline.Get(t));

      p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

      const drag = p.velocity.clone();
      drag.multiplyScalar(timeElapsed * 0.4);
      drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
      drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
      drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
      p.velocity.sub(drag);
      
      p.velocity.y -= timeElapsed * 1.5;
    }

    this._particles.sort((a, b) => {
      const d1 = this._camera.position.distanceTo(a.position);
      const d2 = this._camera.position.distanceTo(b.position);

      if (d1 > d2) {
        return -1;
      }

      if (d1 < d2) {
        return 1;
      }

      return 0;
    });
  }

  Step(timeElapsed) {
    this._AddParticles(timeElapsed);
    this._UpdateParticles(timeElapsed);
    this._UpdateGeometry();
  }
}

class CampfireScene {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);
    this._threejs.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(3, 2, 3);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x111111);
    this._scene.fog = new THREE.Fog(0x111111, 5, 20);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this._scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xE1E1FF, 0.5);
    directionalLight.position.set(-5, 10, -7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this._scene.add(directionalLight);

    // Ground plane
    const groundGeometry = new THREE.CircleGeometry(20, 64);
    const groundTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grassnoise.jpg');
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(10, 10);
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      color: 0x5C4033,
      roughness: 1.0,
      metalness: 0.0
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this._scene.add(ground);

    //ground details
    this._addGroundDetails();

    // Campfire structure
    this._campfire = new THREE.Group();
    this._scene.add(this._campfire);

    // Logs
    const logGeometry = new THREE.CylinderGeometry(0.1, 0.15, 2, 12);
    const logMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.8,
      metalness: 0.0
    });

    const logCount = 8;
    for (let i = 0; i < logCount; i++) {
      const angle = (i / logCount) * Math.PI * 2;
      const log = new THREE.Mesh(logGeometry, logMaterial);
      
      log.position.x = Math.cos(angle) * 0.6;
      log.position.z = Math.sin(angle) * 0.6;
      log.position.y = 0.1;
      
      log.rotation.z = angle;
      log.rotation.x = Math.PI / 2 + 0.3;
      
      log.castShadow = true;
      this._campfire.add(log);
    }

    // Rocks
    const rockGeometry = new THREE.DodecahedronGeometry(0.2, 1);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.8,
      metalness: 0.1
    });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 0.8 + Math.random() * 0.2;
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      rock.position.x = Math.cos(angle) * radius;
      rock.position.z = Math.sin(angle) * radius;
      rock.position.y = 0.1;
      
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.scale.setScalar(0.7 + Math.random() * 0.6);
      
      rock.castShadow = true;
      this._campfire.add(rock);
    }

    // Fire light source
    this._fireLight = new THREE.PointLight(0xffa040, 5, 10, 2);
    this._fireLight.position.set(0, 0.5, 0);
    this._fireLight.castShadow = true;
    this._fireLight.shadow.mapSize.width = 512;
    this._fireLight.shadow.mapSize.height = 512;
    this._campfire.add(this._fireLight);

    // trees around the campfire
    this._addForest();

    // base
    const emberGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const emberMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF4000,
      transparent: true,
      opacity: 0.7
    });

    for (let i = 0; i < 20; i++) {
      const radius = 0.2 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 0.2;
      
      const ember = new THREE.Mesh(emberGeometry, emberMaterial);
      ember.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      ember.scale.setScalar(0.5 + Math.random());
      this._campfire.add(ember);
    }

    // Particle system for fire
    this._particles = new ParticleSystem({
        parent: this._scene,
        camera: this._camera,
        campfire: this._campfire
    });

    // Controls
    const controls = new OrbitControls(this._camera, this._threejs.domElement);
    controls.target.set(0, 0.5, 0);
    controls.update();

    this._previousRAF = null;
    this._RAF();
  }

  _addGroundDetails() {
    const rockGeometry = new THREE.DodecahedronGeometry(0.1, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.8,
      metalness: 0.1
    });

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 8;
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      rock.position.x = Math.cos(angle) * radius;
      rock.position.z = Math.sin(angle) * radius;
      rock.position.y = 0.05;
      
      rock.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      rock.scale.setScalar(0.3 + Math.random() * 0.4);
      
      rock.castShadow = true;
      this._scene.add(rock);
    }
  }

  _addForest() {
    // Load trunk texture
    const trunkTexture = new THREE.TextureLoader().load('https://t4.ftcdn.net/jpg/02/86/50/73/360_F_286507312_9TxHRyUnhAFi7E7ZNvL0FqNvNlwVEuzE.jpg');
    trunkTexture.wrapS = trunkTexture.wrapT = THREE.RepeatWrapping;
    
    // Trunk material
    const trunkMaterial = new THREE.MeshStandardMaterial({
      map: trunkTexture,
      color: 0x5C4033,
      roughness: 0.9,
      metalness: 0.0
    });

    // Load leaves texture
    const leavesTexture = new THREE.TextureLoader().load('https://upload.wikimedia.org/wikipedia/commons/5/53/Dark_green_seamless_vegetation_leaves_foliage_dense_bush_shrub_texture.jpg');
    leavesTexture.wrapS = leavesTexture.wrapT = THREE.RepeatWrapping;
    
    // Leaves material
    const leavesMaterial = new THREE.MeshStandardMaterial({
      map: leavesTexture,
      color: 0x2E8B57,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true
    });

    // Create trees
    const treeCount = 12;
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const distance = 5 + Math.random() * 5;
      const treeHeight = 3 + Math.random() * 2;
      const trunkRadius = 0.3 + Math.random() * 0.2;
      
      // Tree position
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Create trunk
      const trunkGeometry = new THREE.CylinderGeometry(
        trunkRadius * 0.8, 
        trunkRadius, 
        treeHeight, 
        8
      );
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(x, treeHeight/2, z);
      trunk.castShadow = true;
      this._scene.add(trunk);
      
      // Create leaves (simple cone shape)
      const leavesGeometry = new THREE.ConeGeometry(
        trunkRadius * 3, 
        treeHeight * 0.7, 
        8
      );
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.set(x, treeHeight + treeHeight * 0.35, z);
      leaves.castShadow = true;
      this._scene.add(leaves);
    }
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      // Update fire light flicker
      this._fireLight.intensity = 3 + Math.sin(Date.now() * 0.005) * 2;

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    this._particles.Step(timeElapsedS);
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new CampfireScene();
});