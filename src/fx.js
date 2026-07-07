// Hit feel toolkit: hitstop, screenshake, spark particles, dust, afterimages, KO slow-mo.
import * as THREE from 'three';

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.hitstopT = 0;
    this.slowmoT = 0;
    this.slowmoScale = 1;
    this.shakeMag = 0;
    this.shakeVec = new THREE.Vector3();
    this.particles = [];
    this.afterimages = [];
    this.pool = [];

    this.sparkGeo = new THREE.PlaneGeometry(0.09, 0.09);
    this.flashLight = new THREE.PointLight(0xffcc66, 0, 9);
    this.flashLight.position.set(0, 1.4, 1.2);
    scene.add(this.flashLight);
  }

  hitstop(sec) { this.hitstopT = Math.max(this.hitstopT, sec); }
  shake(mag) { this.shakeMag = Math.max(this.shakeMag, mag); }
  slowmo(sec, scale = 0.22) { this.slowmoT = sec; this.slowmoScale = scale; }

  // returns {fighterDt, fxDt} given real dt
  step(dt) {
    let scale = 1;
    if (this.slowmoT > 0) { this.slowmoT -= dt; scale = this.slowmoScale; }
    let fighterDt = dt * scale;
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      fighterDt = 0;
    }
    return fighterDt;
  }

  spark(x, y, color = 0xffb347, count = 14, speed = 4.5) {
    for (let i = 0; i < count; i++) {
      const m = this._getSpark(color);
      m.position.set(x, y, 0.25 + Math.random() * 0.3);
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.85);
      this.particles.push({
        mesh: m, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: (Math.random() - 0.5) * 2,
        life: 0.28 + Math.random() * 0.2, t: 0, grav: 6,
      });
    }
    this.flashLight.position.set(x, y, 1.0);
    this.flashLight.intensity = 26;
  }

  blockSpark(x, y) { this.spark(x, y, 0x7fb7ff, 9, 3.2); }

  dust(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const m = this._getSpark(0xbbaa88);
      m.position.set(x + (Math.random() - 0.5) * 0.5, y + 0.04, 0.2 + Math.random() * 0.3);
      const a = Math.random() * Math.PI;
      this.particles.push({
        mesh: m, vx: Math.cos(a) * 1.6, vy: Math.abs(Math.sin(a)) * 1.4, vz: (Math.random() - 0.5),
        life: 0.4 + Math.random() * 0.25, t: 0, grav: 3,
      });
    }
  }

  ring(x, y, color = 0xffe08a) {
    const geo = new THREE.RingGeometry(0.05, 0.09, 24);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0.5);
    this.scene.add(m);
    this.particles.push({ mesh: m, ring: true, life: 0.3, t: 0, vx: 0, vy: 0, vz: 0, grav: 0 });
  }

  afterimage(rig, color) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false });
    const group = new THREE.Group();
    rig.root.updateMatrixWorld(true);
    rig.root.traverse((o) => {
      if (o.isMesh) {
        const c = new THREE.Mesh(o.geometry, mat);
        o.getWorldPosition(c.position);
        o.getWorldQuaternion(c.quaternion);
        o.getWorldScale(c.scale);
        group.add(c);
      }
    });
    this.scene.add(group);
    this.afterimages.push({ group, mat, life: 0.25, t: 0 });
  }

  _getSpark(color) {
    let m = this.pool.pop();
    if (!m) {
      m = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    }
    m.material.color.set(color);
    m.material.opacity = 1;
    m.visible = true;
    this.scene.add(m);
    return m;
  }

  update(dt, camera) {
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.scene.remove(p.mesh);
        if (p.ring) { p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
        else { p.mesh.visible = false; this.pool.push(p.mesh); }
        this.particles.splice(i, 1);
        continue;
      }
      const u = p.t / p.life;
      if (p.ring) {
        const s = 1 + u * 14;
        p.mesh.scale.set(s, s, s);
        p.mesh.material.opacity = 0.9 * (1 - u);
      } else {
        p.vy -= p.grav * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.material.opacity = 1 - u * u;
        const s = 1 - u * 0.6;
        p.mesh.scale.set(s, s, s);
        p.mesh.lookAt(camera.position);
      }
    }
    // afterimages
    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.t += dt;
      if (a.t >= a.life) {
        this.scene.remove(a.group);
        a.mat.dispose();
        this.afterimages.splice(i, 1);
      } else {
        a.mat.opacity = 0.35 * (1 - a.t / a.life);
      }
    }
    // flash light decay
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - dt * 200);
    // shake decay
    this.shakeMag = Math.max(0, this.shakeMag - dt * 1.6);
    this.shakeVec.set(
      (Math.random() - 0.5) * this.shakeMag,
      (Math.random() - 0.5) * this.shakeMag * 0.7,
      0
    );
  }
}
