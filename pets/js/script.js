import * as THREE from "three";
import { FluidSimulation } from "./FluidSimulation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import p5 from "p5";

gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.batch(".card", {
  onEnter: batch =>
    gsap.to(batch, { autoAlpha: 1, stagger: 0.2, duration: 1, ease: "sine.out" }),
});

const config = {
  simResolution: 256,
  dyeResolution: 1024,
  curl: 50,
  pressureIterations: 40,
  velocityDissipation: 0.95,
  dyeDissipation: 0.95,
  splatRadius: 0.3,
  forceStrength: 8.5,
  pressureDecay: 0.75,
  threshold: 1.0,
  edgeSoftness: 0.0,
  inkColor: new THREE.Color("#6aa1f3"),
};

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {  // double rAF ensures layout is complete
      new FluidSimulation(document.getElementById("fluid"), config);
    });
  });
});
// ── Particle Fluid ────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 120; // ✅ start lower, raise once confirmed working
const PARTICLE_SIZE  = 12;
const SPACING        = PARTICLE_SIZE * 12;
const HOVER_RADIUS   = 250;
const HOVER_STRENGTH = 50;

new p5((p) => {
  let particles    = [];
  let gravity;
  let deltaTime    = 1 / 60;
  let mousePrevX   = 0;
  let mousePrevY   = 0;
  let pendingSpawns = 0;
  let cols = 1, startX = 0, startY = 0; // ✅ shared between setup and draw

  class Particle {
    constructor(x, y) {
      this.pos           = p.createVector(x, y);
      this.vel           = p.createVector(p.random(-20, 20), p.random(-20, 20));
      this.acc           = p.createVector(0, 0);
      this.color         = p.color(255, 255, 255);
      this.lastPos       = p.createVector(x, y);
      this.densityFactor = 0;
      this.rotation      = p.random(p.TWO_PI);
      this.rotationVel   = p.random(-0.1, 0.1);
      this.shapeType     = p.random(["triangle", "square", "circle"]);
    }

    update() {
      this.lastPos.x = this.pos.x;
      this.lastPos.y = this.pos.y;

      this.rotation += this.rotationVel * deltaTime;

      let gravityScale = p.map(this.densityFactor, 0, 5, 1, 0.7);
      // ✅ .copy().mult() instead of p5.Vector.mult()
      this.acc.add(gravity.copy().mult(4 * gravityScale));

      let mouseDelta = p.createVector(p.mouseX - mousePrevX, p.mouseY - mousePrevY);
      let mouseSpeed = mouseDelta.mag();
      let dHover     = p.dist(this.pos.x, this.pos.y, p.mouseX, p.mouseY);

      if (dHover < HOVER_RADIUS) {
        let repel = p5.Vector.sub(this.pos, p.createVector(p.mouseX, p.mouseY));
        repel.normalize();
        let falloff    = p.pow(p.map(dHover, 0, HOVER_RADIUS, 1, 0), 1.5);
        let speedScale = p.constrain(mouseSpeed * 0.5, 0, 1);
        repel.mult(HOVER_STRENGTH * falloff * speedScale);
        this.acc.add(repel);
        this.rotationVel += mouseSpeed * 0.005 * p.random(-1, 1);
      }

      if (p.mouseIsPressed) {
        let d = p.dist(this.pos.x, this.pos.y, p.mouseX, p.mouseY);
        if (d < 250) {
          let mouseVel     = p.createVector(p.mouseX - mousePrevX, p.mouseY - mousePrevY);
          let densityScale = p.map(this.densityFactor, 0, 5, 1, 0.85);
          let force        = mouseVel.copy().mult(10 * densityScale);
          let strength     = p.pow(p.map(d, 0, 250, 1, 0), 1.75);
          force.mult(strength);
          this.acc.add(force);
          this.rotationVel += mouseVel.mag() * 0.01 * p.random(-1, 1);
        }
      }

      let dampingFactor = p.map(this.densityFactor, 0, 5, 1, 1);
      // ✅ .copy().mult() instead of p5.Vector.mult()
      this.vel.add(this.acc.copy().mult(deltaTime * 15.0 * dampingFactor));

      if (this.pos.y > p.height - PARTICLE_SIZE * 2) {
        this.vel.mult(0.92);
        this.vel.x       *= 0.94;
        this.rotationVel *= 0.95;
      } else {
        this.vel.mult(0.985);
        this.rotationVel *= 0.99;
      }

      // ✅ .copy().mult() instead of p5.Vector.mult()
      this.pos.add(this.vel.copy().mult(deltaTime * 11.5));

      const bounce = 0.45;
      const buffer = PARTICLE_SIZE;
      if (this.pos.x < buffer)            { this.pos.x = buffer;            this.vel.x =  Math.abs(this.vel.x) * bounce; }
      if (this.pos.x > p.width - buffer)  { this.pos.x = p.width - buffer;  this.vel.x = -Math.abs(this.vel.x) * bounce; }
      if (this.pos.y < buffer)            { this.pos.y = buffer;            this.vel.y =  Math.abs(this.vel.y) * bounce; }
      if (this.pos.y > p.height - buffer) { this.pos.y = p.height - buffer; this.vel.y = -Math.abs(this.vel.y) * bounce; }

      this.acc.mult(0);
      this.densityFactor = 0;
    }

    draw() {
      p.noStroke();
      p.fill(this.color);

      let renderX = p.lerp(this.lastPos.x, this.pos.x, 0.5);
      let renderY = p.lerp(this.lastPos.y, this.pos.y, 0.5);

      p.push();
      p.translate(renderX, renderY);
      p.rotate(this.rotation);

      const size = PARTICLE_SIZE;
      switch (this.shapeType) {
        case "triangle": p.triangle(-size/2, size/2, size/2, size/2, 0, -size/2); break;
        case "square":   p.rectMode(p.CENTER); p.rect(0, 0, size, size);          break;
        case "circle":   p.circle(0, 0, size);                                     break;
      }
      p.pop();
    }

    interact(other) {
      let d = p.dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (d < SPACING) {
        let densityIncrease  = p.map(d, 0, SPACING, 1.2, 0.1);
        this.densityFactor  += densityIncrease;
        other.densityFactor += densityIncrease;

        let force = p5.Vector.sub(this.pos, other.pos);
        force.normalize();
        let strength = p.pow(p.map(d, 0, SPACING, 0.8, 0), 1.1);
        force.mult(strength);

        let overlap = SPACING - d;
        if (overlap > 0) {
          let correctionStrength = p.map(overlap, 0, SPACING, 0.15, 0.25);
          let correction         = force.copy().mult(overlap * correctionStrength);

          let boundaryFactor = 1.0;
          if (this.pos.y > p.height - PARTICLE_SIZE * 4 ||
              other.pos.y > p.height - PARTICLE_SIZE * 4) {
            boundaryFactor = 0.7;
          }
          correction.mult(boundaryFactor);

          let densityScale     = p.map(this.densityFactor + other.densityFactor, 0, 10, 1, 0.9);
          let correctionWeight = 0.15 * densityScale;
          // ✅ .copy().mult() instead of p5.Vector.mult()
          this.pos.add(correction.copy().mult(correctionWeight));
          other.pos.sub(correction.copy().mult(correctionWeight));

          // ✅ .copy().add() instead of p5.Vector.add()
          let avgVel        = this.vel.copy().add(other.vel).mult(0.5);
          let velocityBlend = p.map(d, 0, SPACING, 0.15, 0.02);
          velocityBlend    *= p.map(this.densityFactor + other.densityFactor, 0, 10, 1.2, 0.95);
          if (d < SPACING * 0.5) velocityBlend *= 1.5;

          this.vel.lerp(avgVel, velocityBlend);
          other.vel.lerp(avgVel, velocityBlend);
        }

        let accForce = force.copy().mult(0.4);
        this.acc.add(accForce);
        other.acc.sub(accForce);
      }
    }
  }

  p.setup = () => {
    const container = document.getElementById("particle-canvas");
    p.createCanvas(container.offsetWidth, container.offsetHeight);
    p.frameRate(60);
    gravity = p.createVector(0, 2.2); // ✅ gravity created here, after p is ready

    const availableWidth = p.width * 0.95;
    cols   = Math.floor(availableWidth / SPACING);
    startX = (p.width - cols * SPACING) * 0.5;
    startY = p.height * 0.05;

    pendingSpawns = PARTICLE_COUNT; // ✅ spawn gradually, not all at once
  };

  p.draw = () => {
    // ✅ clamp deltaTime so first frames don't cause huge position jumps
    deltaTime = Math.min(1 / (p.frameRate() || 60), 1 / 30);

    p.background("#1a2ffb");

    // ✅ drip-spawn particles: 5 per frame for smooth startup
    if (pendingSpawns > 0) {
      const batch = Math.min(5, pendingSpawns);
      for (let i = 0; i < batch; i++) {
        const idx = PARTICLE_COUNT - pendingSpawns;
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        particles.push(new Particle(
          startX + col * SPACING + p.random(-5, 5),
          startY + row * SPACING + p.random(-5, 5)
        ));
        pendingSpawns--;
      }
    }

    const grid = {};
    for (let i = 0; i < particles.length; i++) {
      const pt  = particles[i];
      pt.update();
      const gx  = Math.floor(pt.pos.x / SPACING);
      const gy  = Math.floor(pt.pos.y / SPACING);
      const key = `${gx},${gy}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(i);
    }

    for (const key in grid) {
      const cell     = grid[key];
      const [gx, gy] = key.split(",").map(Number);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const neighborKey = `${gx + dx},${gy + dy}`;
          if (grid[neighborKey]) {
            for (const i of cell) {
              for (const j of grid[neighborKey]) {
                if (i < j) particles[i].interact(particles[j]);
              }
            }
          }
        }
      }
    }

    for (const pt of particles) pt.draw();

    mousePrevX = p.mouseX;
    mousePrevY = p.mouseY;
  };

  p.mouseClicked = () => {
    const headerLeft   = p.width  * 0.25;
    const headerRight  = p.width  * 0.75;
    const headerTop    = p.height * 0.3;
    const headerBottom = p.height * 0.7;
    if (p.mouseX > headerLeft && p.mouseX < headerRight &&
        p.mouseY > headerTop  && p.mouseY < headerBottom) return;

    for (let i = 0; i < 8; i++) {
      const pt = new Particle(
        p.mouseX + p.random(-SPACING * 0.5, SPACING * 0.5),
        p.mouseY + p.random(-SPACING * 0.5, SPACING * 0.5)
      );
      pt.vel = p.createVector(p.random(-40, 40), p.random(-60, -10));
      particles.push(pt);
    }
  };

  p.windowResized = () => {
    const container = document.getElementById("particle-canvas");
    p.resizeCanvas(container.offsetWidth, container.offsetHeight);
  };

}, document.getElementById("particle-canvas"));