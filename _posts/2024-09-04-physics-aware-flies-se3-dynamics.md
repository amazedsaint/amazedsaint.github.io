---
layout: default
title: "Physics Aware Flies: Generative Dynamics on SE(3)"
date: 2024-09-04
categories: research simulation
author: amazedsaint
description: "A clickable 3D swarm demonstrates Langevin-like dynamics on a Lie group: Haar-respecting exploration, potential-driven drift, and online adaptation via a lightweight critic."
tags: [SE3, Lie groups, generative-models, robotics, stochastic-processes, geometry]
math: true
featured: true
---

<style>
  html, body { margin:0; color:#111; font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;}
  
  .simulation-container {
    width: 100%;
    height: 70vh;
    position: relative;
    border: 2px solid #ddd;
    border-radius: 12px;
    overflow: hidden;
    margin: 20px 0;
    background: #ffffff;
  }
  
  #app { position: absolute; inset: 0; }
  
  .article-toggle {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid #2c3e50;
    border-radius: 25px;
    padding: 12px 20px;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    font-weight: 600;
    color: #2c3e50;
    transition: all 0.3s ease;
  }
  
  .article-toggle:hover {
    background: #2c3e50;
    color: white;
    transform: translateX(-50%) scale(1.05);
  }
  
  .article-content {
    display: none;
    padding: 40px;
    background: white;
    margin-top: 20px;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    border: 2px solid #e9ecef;
  }
  
  .article-content.expanded {
    display: block;
  }
  
  .arrow {
    margin-left: 10px;
    transition: transform 0.3s ease;
  }
  
  .arrow.rotated {
    transform: rotate(180deg);
  }
  
  .hud {
    position: absolute; left: 12px; bottom: 12px; background: rgba(0,0,0,0.12);
    padding: 8px 10px; border-radius: 10px; font-size: 12px; line-height:1.4;
    backdrop-filter: blur(4px); color:#111; border:1px solid rgba(0,0,0,0.08);
  }
  
  .panel {
    position: absolute; right: 10px; top: 10px; width: 380px; max-width: 52%;
    background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.08);
    color:#111; border-radius: 14px; padding: 10px 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    backdrop-filter: blur(8px);
  }
  
  .panel h3{margin:8px 0 8px 0; font-weight:700; font-size:15px;}
  .row { display:flex; gap:8px; align-items:center; margin:6px 0;}
  .row label{ flex: 0 0 160px; font-size:12px; opacity:0.9;}
  .row input[type=range]{ flex:1;}
  .row select, .row button, .row input[type=checkbox]{ font-size:12px; }
  .row .val { width:56px; text-align:right; font-variant-numeric: tabular-nums;}
  .btn{ background:#111; border:0; color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer;}
  .btn.secondary { background:#e6e6e6; color:#111; }
  .pill { display:inline-block; padding:2px 8px; border-radius:999px; border:1px solid #ddd; font-size:11px; margin-left:6px;}
  .legend { font-size:11px; opacity:0.9; line-height:1.3; }
  .helptoggle{ position:absolute; left:12px; top:12px; }
  .help {
    position: absolute; left: 12px; top: 48px; width: 360px; max-width: 52%;
    background: rgba(255,255,255,0.9); color:#111; border:1px solid rgba(0,0,0,0.1);
    padding: 12px; border-radius: 12px; font-size: 12px; line-height:1.4; display:none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15); backdrop-filter: blur(8px);
  }
  
  @media (max-width: 768px) {
    .simulation-container {
      height: 60vh;
    }
    
    .panel {
      width: 320px;
      max-width: 90%;
    }
    
    .article-toggle {
      padding: 10px 16px;
      font-size: 0.9rem;
    }
  }
</style>

<div class="simulation-container">
  <div id="app"></div>
  
  <button class="btn secondary helptoggle" id="toggleHelp">Help</button>
  <div class="help" id="help">
    <b>Simulator ↔ Ideas</b>
    <ul>
      <li><b>Flies</b> = Agents with poses in <b>SE(3)</b>; they move by sampling <i>on‑manifold</i> increments (body‑frame step + small rotation) and left‑multiplying their pose.</li>
      <li><b>Generator</b> (top panel) samples increments from a mixture:
        <div class="legend">
          <b>Haar</b> (uniform orientation on SO(3)) — preserves measure; <b>Goal</b> — heads toward nearest <span style="color:#ad8c00">attractor</span>; 
          <b>Plume</b> — follows <span style="color:#1e7aff">attention</span> gradient; <b>Explore</b> — jitter/curiosity.
        </div>
      </li>
      <li><b>Critic</b> (GAN-like) scores proposals by reward: closer to attractors, away from repellents, riding attention plumes, avoiding walls/collisions. With <b>Evolve</b> ✓, the generator's mixture weights update online (REINFORCE‑style).</li>
      <li><b>Click inside box</b> with the current <i>Click Mode</i>:
        <ul>
          <li><b>Attractor</b> (gold sphere): pulls agents; think "goal".</li>
          <li><b>Repellent</b> (red sphere): pushes agents; think "risk".</li>
          <li><b>Plume</b> (blue puff): injects <i>attention</i> that diffuses/decays; think "trend/signal".</li>
          <li>Shift‑click removes the nearest object.</li>
        </ul>
      </li>
      <li><b>Ghost segments</b> show sampled proposals (the generator's one‑step prior) near a subset of flies — you're seeing the distribution you're training.</li>
    </ul>
  </div>

  <div class="panel" id="ui">
    <h3>Generative Prior (SE(3) increments)</h3>
    <div class="row">
      <label>Mode</label>
      <select id="gmode">
        <option value="haar">Haar (uniform SO(3))</option>
        <option value="goal">Goal‑seeking</option>
        <option value="plume">Plume‑gradient</option>
        <option value="mixture" selected>Mixture (all)</option>
      </select>
      <span class="pill">Prior</span>
    </div>
    <div class="row">
      <label>κ (direction concentration)</label>
      <input id="kappa" type="range" min="0" max="20" step="0.1" value="6"><div class="val" id="kappaV">6.0</div>
    </div>
    <div class="row">
      <label>Haar mix λ</label>
      <input id="mix" type="range" min="0" max="1" step="0.01" value="0.15"><div class="val" id="mixV">0.15</div>
    </div>
    <div class="row">
      <label>Proposals / step</label>
      <input id="props" type="range" min="1" max="12" step="1" value="6"><div class="val" id="propsV">6</div>
    </div>
    <div class="row">
      <label>σ<sub>t</sub> transl. noise</label>
      <input id="sigT" type="range" min="0" max="0.6" step="0.01" value="0.12"><div class="val" id="sigTV">0.12</div>
    </div>
    <div class="row">
      <label>Show prior samples</label><input id="showPrior" type="checkbox" checked>
    </div>

    <h3>Critic & Evolution</h3>
    <div class="row"><label>Evolve generator</label><input id="evolve" type="checkbox" checked></div>
    <div class="row"><label>Critic weights (goal/plume/repel)</label>
      <input id="wGoal" type="range" min="0" max="2" step="0.05" value="1.0"><div class="val" id="wGoalV">1.00</div>
    </div>
    <div class="row">
      <label></label>
      <input id="wPlume" type="range" min="0" max="2" step="0.05" value="0.8"><div class="val" id="wPlumeV">0.80</div>
    </div>
    <div class="row">
      <label></label>
      <input id="wRepel" type="range" min="0" max="2" step="0.05" value="1.2"><div class="val" id="wRepelV">1.20</div>
    </div>

    <h3>World & Agents</h3>
    <div class="row"><label>Flies</label><input id="flies" type="range" min="50" max="1500" step="10" value="400"><div class="val" id="fliesV">400</div></div>
    <div class="row"><label>Speed scale</label><input id="speed" type="range" min="0" max="3" step="0.01" value="1.0"><div class="val" id="speedV">1.00</div></div>
    <div class="row"><label>Time scale</label><input id="tscale" type="range" min="0.2" max="2.0" step="0.01" value="1.0"><div class="val" id="tscaleV">1.00</div></div>

    <h3>Click Mode</h3>
    <div class="row">
      <select id="clickMode">
        <option value="attractor">Add Attractor</option>
        <option value="repellent">Add Repellent</option>
        <option value="plume">Add Plume</option>
        <option value="none">Inspect only</option>
      </select>
      <button class="btn secondary" id="clearAll">Clear</button>
      <button class="btn secondary" id="pause">Pause</button>
    </div>

    <div class="legend">
      <b>Legend:</b> Attractor <span style="color:#ad8c00">●</span> &nbsp; Repellent <span style="color:#cc2a2a">●</span> &nbsp; Plume <span style="color:#1e7aff">●</span><br/>
      Prior samples: Haar (gray) • Goal (green) • Plume (blue) • Explore (magenta)
    </div>
  </div>

  <div class="hud" id="hud">t=0 | flies=0 | proposals=0 | reward=0.00 | haarΔ(yaw)=0.00</div>
</div>

<button class="article-toggle" id="article-toggle">
  Read Full Article <span class="arrow">▼</span>
</button>

<div class="article-content" id="article-content">

# Generative dynamics on SE(3) reveal how symmetry, noise and reward shape motion

**Abstract.**
Motion in three dimensions is naturally expressed on the Lie group $SE(3)$, the set of rigid transforms combining rotations $SO(3)$ with translations $\mathbb{R}^3$. Here we present an interactive swarm in which each agent ("fly") evolves by sampling infinitesimal **on-manifold** increments and applying them by left multiplication. A small **generative prior** supplies candidate increments; a **GAN-like critic** assigns rewards tied to user-placed attractors, repellents and a diffusing scalar "plume". Selecting and reinforcing high-reward proposals produces structured transport while preserving the symmetries of space.

**Main.**
The pose of each agent is a homogeneous transform

$$
T=\begin{pmatrix}R & t \\ 0 & 1\end{pmatrix}\in SE(3),\quad R\in SO(3),\ t\in\mathbb{R}^3.
$$

Updates are performed in the tangent space $\mathfrak{se}(3)$: we draw a **twist** $\xi=[\rho,\omega]\in\mathbb{R}^6$ and advance

$$
T_{t+1} \;=\; \exp(\xi_t)\,T_t.
$$

The exponential map uses the classical Rodrigues form for rotations,

$$
R(\omega)=\exp(\widehat{\omega})=I+\frac{\sin\theta}{\theta}\widehat{\omega}+\frac{1-\cos\theta}{\theta^2}\widehat{\omega}^2,\quad \theta=\|\omega\|,
$$

and a coupled translation via

$$
\exp\!\begin{pmatrix}\widehat{\omega}&\rho\\0&0\end{pmatrix}
=
\begin{pmatrix}
R(\omega) & V(\omega)\rho\\ 0 & 1
\end{pmatrix},\quad
V(\omega)=I+\frac{1-\cos\theta}{\theta^2}\widehat{\omega}+\frac{\theta-\sin\theta}{\theta^3}\widehat{\omega}^2.
$$

In this formulation, orientation and position evolve coherently and never leave the manifold; there are no parameterization artefacts.

Candidate increments are drawn from a **mixture prior** with four physically interpretable components. A **Haar-uniform** term supplies orientation noise that is truly uniform on $SO(3)$—a symmetry-respecting baseline for exploration. A **goal-seeking** term concentrates proposals toward the nearest user-placed attractor (implemented as a von-Mises–Fisher-like directional sampler). A **plume-following** term aligns proposals with the gradient of a diffusing, decaying scalar field seeded by clicks. A small **exploration** term contributes body-frame jitter. Visual "ghost" segments in the scene show these one-step proposals, making the prior itself observable.

A lightweight **critic** converts a proposed next state $T'$ into a scalar reward,

$$
R(T') \;=\; w_g\,\phi_{\mathrm{goal}}(T') + w_p\,\phi_{\mathrm{plume}}(T') - w_r\,\phi_{\mathrm{repel}}(T') - w_w\,\phi_{\mathrm{wall}}(T') - w_c\,\phi_{\mathrm{collision}}(T'),
$$

favoring proximity to attractors and strong plume signal, while penalizing walls, repellents and crowding. At each step, the agent selects the highest-reward proposal (a one-step free-energy descent) and updates its mixture weights by a small **policy-gradient** correction,

$$
\Delta \alpha_c \;\propto\; \eta\,\big(\mathbf{1}\{c=c^\star\}-\pi_\alpha(c)\big)\,R(T^\star),
$$

where $\alpha$ are component logits and $\pi_\alpha$ their softmax. Components that repeatedly yield good moves grow in prevalence; those that do not recede. This "GAN-like" loop is intentionally modest: it shapes behaviour without heavy function approximation, and it leaves the manifold geometry intact.

The resulting dynamics resemble **Langevin motion on a symmetry manifold**: symmetric noise (Haar on $SO(3)$) plus **potential-driven drift** derived from user-defined fields. The white box acts as a boundary condition; reflections model elastic encounters. The plume field provides an intuitive language for exogenous information—clicks inject localized sources into a diffusion equation that then spreads and decays. Because all updates are computed in $\mathfrak{se}(3)$ and applied via the exponential map, the simulation respects the kinematics of rigid bodies used in robotics, vision and molecular modelling.

Several observations follow. First, **geometry matters**: using $SE(3)$ directly avoids the biases and singularities of Euclidean parameterizations, and the Haar component prevents covert frame preferences. Second, **structure can be light**: a small set of task-aligned directions, blended with symmetry-respecting noise, already produces rich transport. Third, **the prior should be visible**: rendering proposals exposes failure modes (e.g. collapsed headings or wall hugging) and makes tuning ethical—users can see what the model intends to do before it acts. Finally, **fields are a programmable substrate**: attractors, repellents and plumes offer a compact way to sculpt behaviour without specifying policies explicitly.

Although the present implementation is pedagogical, the ingredients align with practice: manifold-correct motion models for tracking, proposal priors for 6-DoF pose estimation, and energy-shaping controllers for navigation. The interactive setting highlights the unifying theme: **symmetry, noise and reward** can be composed cleanly when the state space is treated as a group, not a vector space.

</div>

<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Article toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('article-toggle');
  const content = document.getElementById('article-content');
  const arrow = toggle.querySelector('.arrow');
  
  toggle.addEventListener('click', () => {
    content.classList.toggle('expanded');
    arrow.classList.toggle('rotated');
    toggle.innerHTML = content.classList.contains('expanded') 
      ? 'Hide Article <span class="arrow rotated">▼</span>'
      : 'Read Full Article <span class="arrow">▼</span>';
  });
});

////////////////////////////////////////////////////////////////////////////////
// Small helpers
////////////////////////////////////////////////////////////////////////////////
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
function randn(){ let u=1-Math.random(), v=1-Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function wrapPi(a){ a=(a+Math.PI)%(2*Math.PI); if(a<0) a+=2*Math.PI; return a-Math.PI; }
function hueToRGB(h,s=0.9,v=1.0){
  const i=Math.floor(h*6), f=h*6-i, p=v*(1-s), q=v*(1-f*s), t=v*(1-(1-f)*s);
  let r,g,b; switch(i%6){case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;case 5:r=v;g=p;b=q;break;}
  return new THREE.Color(r,g,b);
}

////////////////////////////////////////////////////////////////////////////////
// 3D attention plume field (diffuse/decay) — coarse grid, compute-only
////////////////////////////////////////////////////////////////////////////////
class Field3D {
  constructor(N=32, boxSize=20){
    this.N=N; this.size=boxSize;
    this.h=this.size/N;
    this.A=new Float32Array(N*N*N); // attention [0,1]
    this.tmp=new Float32Array(N*N*N);
    this.diff=0.18; this.decay=0.02;
    this.plumes=[]; // [{x,y,z,amp,ttl}]
  }
  idx(x,y,z){ return x + this.N*(y + this.N*z); }
  clampi(i){ return Math.max(0, Math.min(this.N-1, i)); }
  addPlume(pos, amp=1.0){
    this.plumes.push({x:pos.x, y:pos.y, z:pos.z, amp, ttl:10.0});
    // deposit to grid
    const gx = Math.round((pos.x/this.size + 0.5) * (this.N-1));
    const gy = Math.round((pos.y/this.size + 0.5) * (this.N-1));
    const gz = Math.round((pos.z/this.size + 0.5) * (this.N-1));
    const r=2;
    for(let k=-r;k<=r;k++) for(let j=-r;j<=r;j++) for(let i=-r;i<=r;i++){
      const xi=this.clampi(gx+i), yi=this.clampi(gy+j), zi=this.clampi(gz+k);
      const d=i*i+j*j+k*k;
      if(d<=r*r){ this.A[this.idx(xi,yi,zi)] = clamp(this.A[this.idx(xi,yi,zi)] + amp*(1-d/(r*r+1)), 0, 1); }
    }
  }
  step(dt){
    // simple 3D 6-neighborhood diffusion + decay
    const N=this.N, A=this.A, T=this.tmp;
    for(let z=0; z<N; z++){
      for(let y=0; y<N; y++){
        for(let x=0; x<N; x++){
          const i=this.idx(x,y,z);
          const c=A[i];
          const n = A[this.idx(this.clampi(x+1),y,z)];
          const s = A[this.idx(this.clampi(x-1),y,z)];
          const e = A[this.idx(x,this.clampi(y+1),z)];
          const w = A[this.idx(x,this.clampi(y-1),z)];
          const u = A[this.idx(x,y,this.clampi(z+1))];
          const d = A[this.idx(x,y,this.clampi(z-1))];
          // laplacian
          const L = -6*c + n+s+e+w+u+d;
          let a = c + this.diff*L*dt - this.decay*c*dt;
          T[i] = clamp(a, 0, 1);
        }
      }
    }
    this.A.set(T);
    // age plumes (for UI visuals)
    for(const p of this.plumes){ p.ttl -= dt; }
    this.plumes = this.plumes.filter(p=>p.ttl>0);
  }
  // sample tri-linear value
  sample(pos){
    const gx = (pos.x/this.size + 0.5)*(this.N-1);
    const gy = (pos.y/this.size + 0.5)*(this.N-1);
    const gz = (pos.z/this.size + 0.5)*(this.N-1);
    const x0=Math.floor(gx), y0=Math.floor(gy), z0=Math.floor(gz);
    const tx=gx-x0, ty=gy-y0, tz=gz-z0;
    const v=(x,y,z)=> this.A[this.idx(this.clampi(x),this.clampi(y),this.clampi(z))];
    const c000=v(x0,y0,z0), c100=v(x0+1,y0,z0), c010=v(x0,y0+1,z0), c110=v(x0+1,y0+1,z0);
    const c001=v(x0,y0,z0+1), c101=v(x0+1,y0,z0+1), c011=v(x0,y0+1,z0+1), c111=v(x0+1,y0+1,z0+1);
    const c00 = c000*(1-tx)+c100*tx;
    const c10 = c010*(1-tx)+c110*tx;
    const c01 = c001*(1-tx)+c101*tx;
    const c11 = c011*(1-tx)+c111*tx;
    const c0 = c00*(1-ty)+c10*ty;
    const c1 = c01*(1-ty)+c11*ty;
    return c0*(1-tz)+c1*tz;
  }
  // finite diff gradient
  gradient(pos){
    const h=this.h*0.5;
    const px=new THREE.Vector3(pos.x+h,pos.y,pos.z);
    const nx=new THREE.Vector3(pos.x-h,pos.y,pos.z);
    const py=new THREE.Vector3(pos.x,pos.y+h,pos.z);
    const ny=new THREE.Vector3(pos.x,pos.y-h,pos.z);
    const pz=new THREE.Vector3(pos.x,pos.y,pos.z+h);
    const nz=new THREE.Vector3(pos.x,pos.y,pos.z-h);
    const gx = (this.sample(px)-this.sample(nx))/(2*h);
    const gy = (this.sample(py)-this.sample(ny))/(2*h);
    const gz = (this.sample(pz)-this.sample(nz))/(2*h);
    return new THREE.Vector3(gx,gy,gz);
  }
}

////////////////////////////////////////////////////////////////////////////////
//// World objects (attractors / repellents)
////////////////////////////////////////////////////////////////////////////////
class World {
  constructor(boxSize=20){
    this.size=boxSize;
    this.attractors=[]; // {pos, mesh}
    this.repellents=[];
  }
  nearestAttractor(p){
    let best=null, bd=1e9;
    for(const a of this.attractors){
      const d=a.pos.distanceTo(p);
      if(d<bd){ bd=d; best=a; }
    }
    return {node:best, dist:bd};
  }
  nearestRepellent(p){
    let best=null, bd=1e9;
    for(const r of this.repellents){
      const d=r.pos.distanceTo(p);
      if(d<bd){ bd=d; best=r; }
    }
    return {node:best, dist:bd};
  }
  clear(scene){
    for(const a of this.attractors){ scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose(); }
    for(const r of this.repellents){ scene.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); }
    this.attractors=[]; this.repellents=[];
  }
}

////////////////////////////////////////////////////////////////////////////////
// Generator on SE(3) (body-frame proposal, left-applied)
////////////////////////////////////////////////////////////////////////////////
class GeneratorSE3 {
  constructor(){
    this.mode='mixture';
    this.kappa=6.0;      // higher => more concentrated
    this.haarMix=0.15;   // probability of uniform orientation even in structured modes
    this.sigmaT=0.12;    // translational noise
    this.baseStep=0.18;  // forward step magnitude
    this.propsPerStep=6; // proposals per agent per frame
    this.showPrior=true;

    // simple yaw histogram for Haar divergence monitor
    this.hbins=36; this.hist=new Float32Array(this.hbins); this.htot=1e-6; this.decay=0.995;
  }
  setMode(m){ this.mode=m; }
  recordYaw(yaw){
    for(let i=0;i<this.hbins;i++) this.hist[i]*=this.decay;
    const u=(yaw+Math.PI)/(2*Math.PI);
    const b=(Math.floor(u*this.hbins))%this.hbins;
    this.hist[b]+=1; this.htot=this.htot*this.decay+1;
  }
  haarDivYaw(){
    const K=this.hbins, u=1/K; let chi=0; const tot=Math.max(1e-6,this.htot);
    for(let i=0;i<K;i++){ const p=this.hist[i]/tot; chi += (p-u)*(p-u)/u; }
    return chi;
  }
  // sample unit heading uniformly on S^2 (Haar-projected orientation)
  sampleDirUniform(){
    const u=2*Math.random()-1, phi=TAU*Math.random(); // u=cos(theta)
    const s=Math.sqrt(1-u*u);
    return new THREE.Vector3(s*Math.cos(phi), s*Math.sin(phi), u).normalize();
  }
  // sample direction around mu with concentration kappa (wrapped normal approx on sphere)
  sampleDirVMF(mu, kappa){
    if(kappa<=1e-6) return this.sampleDirUniform();
    // sample by projecting a 3D normal around mu
    const n = new THREE.Vector3(randn(),randn(),randn()).multiplyScalar(1/Math.sqrt(kappa));
    const v = new THREE.Vector3().copy(mu).add(n).normalize();
    return v;
  }
  // components: U=uniform(Haar), G=goal, P=plume, E=explore
  propose(agent, sensed, mode){
    const props=[];
    const comps=[];
    const forward = agent.dir.clone();      // current forward (unit)
    const up = agent.up.clone();
    // candidate heading directions in WORLD frame
    const muGoal = sensed.goalDir;
    const muPlume = sensed.plumeDir;

    const addProp = (dir, label) => {
      // body-frame forward step projected into world using current orientation:
      // choose body-frame v = [vF, vS1, vS2]; map to world basis (forward, side, up×side)
      const vF = this.baseStep * (1 + 0.25*randn());
      // build orthonormal basis from current dir
      const side = new THREE.Vector3().crossVectors(up, forward).normalize();
      const up2 = new THREE.Vector3().crossVectors(forward, side).normalize();
      const vS1 = this.sigmaT * randn();
      const vS2 = this.sigmaT * randn();
      const dpos = new THREE.Vector3().addScaledVector(forward, vF)
                                      .addScaledVector(side, vS1)
                                      .addScaledVector(up2, vS2);
      // rotation: rotate current forward toward 'dir' by small angle (delta heading)
      const axis = new THREE.Vector3().crossVectors(forward, dir);
      const sinA = axis.length();
      let angle = Math.asin(clamp(sinA,-1,1));
      const cosA = forward.dot(dir);
      if (cosA<0) angle = Math.PI-angle; // numeric stability
      angle = clamp(angle, -0.35, 0.35); // small-ish turn per step
      // quaternion to rotate around axis
      const q = new THREE.Quaternion();
      if (sinA>1e-6){
        axis.normalize();
        q.setFromAxisAngle(axis, angle);
      } else {
        q.setFromAxisAngle(up, 0); // no-op
      }
      props.push({dpos, q});
      comps.push(label);
    };

    const chooseHaar = ()=> (Math.random()<this.haarMix);

    const want = (this.mode==='mixture') ? ['haar','goal','plume','explore']
               : (this.mode==='haar') ? ['haar']
               : (this.mode==='goal') ? ['goal']
               : (this.mode==='plume') ? ['plume']
               : ['explore'];

    for (let i=0;i<this.propsPerStep;i++){
      const which = want[i % want.length];
      if (which==='haar'){
        const dir = this.sampleDirUniform();
        addProp(dir,'haar');
        this.recordYaw(Math.atan2(dir.x, dir.z));
      } else if (which==='goal'){
        const dir = (muGoal.lengthSq()>1e-8 && !chooseHaar()) ? this.sampleDirVMF(muGoal, this.kappa) : this.sampleDirUniform();
        addProp(dir,'goal');
        this.recordYaw(Math.atan2(dir.x, dir.z));
      } else if (which==='plume'){
        const dir = (muPlume.lengthSq()>1e-8 && !chooseHaar()) ? this.sampleDirVMF(muPlume, this.kappa) : this.sampleDirUniform();
        addProp(dir,'plume');
        this.recordYaw(Math.atan2(dir.x, dir.z));
      } else { // explore
        const jitter = new THREE.Vector3(randn(), randn(), randn()).normalize();
        addProp(jitter,'explore');
        this.recordYaw(Math.atan2(jitter.x, jitter.z));
      }
    }
    return {props, comps};
  }
}

////////////////////////////////////////////////////////////////////////////////
// GAN-like critic (heuristic reward + evolutionary update of mixture prefs)
////////////////////////////////////////////////////////////////////////////////
class Critic {
  constructor(world, field, boxSize){
    this.world=world; this.field=field; this.size=boxSize;
    this.wGoal=1.0; this.wPlume=0.8; this.wRepel=1.2;
    this.wWall=0.8; this.wColl=0.6;
    this.collRadius=0.5;
  }
  score(nextPos, neighbors){
    // goal reward
    const {node:goal, dist:dg} = this.world.nearestAttractor(nextPos);
    const goalR = goal ? 1.0/(1.0 + dg) : 0.0;
    // repellent penalty
    const {node:rep, dist:dr} = this.world.nearestRepellent(nextPos);
    const repelR = rep ? 1.0/(1.0 + dr) : 0.0;
    // plume reward
    const plume = this.field.sample(nextPos);
    // wall penalty (near box walls)
    const half=this.size/2-0.2;
    const wall = Math.max(0, Math.abs(nextPos.x)-half) + Math.max(0, Math.abs(nextPos.y)-half) + Math.max(0, Math.abs(nextPos.z)-half);
    // simple collision penalty (count neighbors within radius)
    let coll=0;
    for (let j=0;j<neighbors.length;j++){ if (neighbors[j].distanceToSquared(nextPos) < this.collRadius*this.collRadius) coll+=1; }
    const R = + this.wGoal*goalR + this.wPlume*plume
              - this.wRepel*repelR - this.wWall*wall - this.wColl*coll;
    return R;
  }
}

////////////////////////////////////////////////////////////////////////////////
// Flies swarm (instanced), prior visualization, evolution
////////////////////////////////////////////////////////////////////////////////
class Swarm {
  constructor(scene, count, boxSize, generator, critic){
    this.scene=scene; this.count=count; this.size=boxSize;
    this.gen=generator; this.critic=critic;
    this.maxViz = 120; this.samplesPer = 6;
    this.showPrior = true;
    this.speedScale=1.0;

    this.positions=new Array(count);
    this.dir=new Array(count); // forward unit
    this.up=new Array(count);
    this.pref = new Array(count); // per-fly mixture preferences over components
    this._build();
    this._buildViz();
  }
  _build(){
    // instanced "flies": small dark elongated icosahedra
    const geo = new THREE.IcosahedronGeometry(0.08, 0);
    geo.scale(1.6, 0.5, 0.9);
    const mat = new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.7, metalness:0.1 });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.count);
    this.mesh.castShadow=true; this.mesh.receiveShadow=false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.mesh);

    const half=this.size/2-0.5;
    for(let i=0;i<this.count;i++){
      this.positions[i]=new THREE.Vector3(THREE.MathUtils.randFloatSpread(half*2), THREE.MathUtils.randFloatSpread(half*2), THREE.MathUtils.randFloatSpread(half*2));
      // random forward direction on S^2
      const d=this.gen.sampleDirUniform();
      this.dir[i]=d.clone();
      this.up[i]=new THREE.Vector3(0,1,0);
      // initialize preferences (Haar,Goal,Plume,Explore)
      this.pref[i]={haar:0.25, goal:0.25, plume:0.25, explore:0.25};
    }
  }
  _buildViz(){
    // pooled line segments for proposal visualization
    const maxSegments = this.maxViz * this.gen.propsPerStep;
    const pos = new Float32Array(maxSegments*2*3); // start/end
    const col = new Float32Array(maxSegments*2*3);
    this.vizGeom = new THREE.BufferGeometry();
    this.vizGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.vizGeom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.vizGeom.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ vertexColors:true, transparent:true, opacity:0.9, depthWrite:false });
    this.viz = new THREE.LineSegments(this.vizGeom, mat);
    this.scene.add(this.viz);
  }
  _prefVector(p){ return [p.haar, p.goal, p.plume, p.explore]; }
  _prefSoftmax(p){
    const v=this._prefVector(p);
    const m=Math.max(...v);
    const e=v.map(x=>Math.exp(x-m));
    const s=e.reduce((a,b)=>a+b,0);
    return {haar:e[0]/s, goal:e[1]/s, plume:e[2]/s, explore:e[3]/s};
  }
  _updatePrefs(i, chosen, reward, lr=0.05){
    if (!this.evolve) return;
    // REINFORCE-like on categorical: grad = reward*(onehot - probs)
    const p=this._prefSoftmax(this.pref[i]);
    const comps=['haar','goal','plume','explore'];
    for(const c of comps){
      const y = (c===chosen)?1:0;
      const g = reward*(y - p[c]);
      this.pref[i][c] += lr * g;
    }
  }
  neighborsNear(idx, radius=0.8){
    // cheap sampling: check a few random neighbors (avoid O(N^2))
    const n=8, arr=[];
    for(let k=0;k<n;k++){
      const j=((idx + 17*k + 13) % this.count);
      arr.push(this.positions[j]);
    }
    return arr;
  }
  step(field, world, dt){
    // prior viz buffers
    const P=this.vizGeom.getAttribute('position').array;
    const C=this.vizGeom.getAttribute('color').array;
    let segs=0;

    const half=this.size/2-0.05;
    let rewardAvg=0;

    // stride for viz subset
    const stride = Math.max(1, Math.floor(this.count / this.maxViz));
    const colorMap = {
      haar: new THREE.Color(0x999999),
      goal: new THREE.Color(0x2ecc71),
      plume: new THREE.Color(0x1e7aff),
      explore: new THREE.Color(0xc61cff)
    };

    for(let i=0;i<this.count;i++){
      const pos=this.positions[i];
      const fwd=this.dir[i];
      const up=this.up[i];

      // sense
      const gnear = world.nearestAttractor(pos);
      const rnear = world.nearestRepellent(pos);
      const goalDir = (gnear.node) ? new THREE.Vector3().subVectors(gnear.node.pos, pos).normalize() : new THREE.Vector3();
      const plumeGrad = field.gradient(pos).normalize();
      const sensed = {goalDir, plumeDir: plumeGrad};

      // proposals
      this.gen.propsPerStep = this.propsPerStep;
      const {props, comps} = this.gen.propose({dir:fwd, up}, sensed, this.gen.mode);

      // critic scores
      let bestScore=-1e9, bestIdx=0;
      const neigh = this.neighborsNear(i);
      for(let k=0;k<props.length;k++){
        const candPos = new THREE.Vector3().copy(pos).addScaledVector(props[k].dpos, this.speedScale*dt);
        const sc = this.critic.score(candPos, neigh);
        if (sc>bestScore){ bestScore=sc; bestIdx=k; }
        // draw viz for subset
        if (this.showPrior && (i%stride===0)){
          const start=pos, end=new THREE.Vector3().copy(pos).addScaledVector(props[k].dpos, 0.9);
          const col=colorMap[comps[k]] || new THREE.Color(0x000000);
          const b=segs*6;
          P[b  ]=start.x; P[b+1]=start.y; P[b+2]=start.z;
          P[b+3]=end.x;   P[b+4]=end.y;   P[b+5]=end.z;
          C[b  ]=col.r; C[b+1]=col.g; C[b+2]=col.b;
          C[b+3]=col.r; C[b+4]=col.g; C[b+5]=col.b;
          segs++;
        }
      }
      rewardAvg += bestScore;

      // apply best increment (on‑manifold)
      const inc=props[bestIdx];
      pos.addScaledVector(inc.dpos, this.speedScale*dt);

      // bounce / reflect at walls
      if (Math.abs(pos.x)>half){ pos.x = clamp(pos.x, -half, half); this.dir[i].x *= -1; }
      if (Math.abs(pos.y)>half){ pos.y = clamp(pos.y, -half, half); this.dir[i].y *= -1; }
      if (Math.abs(pos.z)>half){ pos.z = clamp(pos.z, -half, half); this.dir[i].z *= -1; }

      // rotate forward by quaternion inc
      this.dir[i].applyQuaternion(inc.q).normalize();

      // evolutionary update of mixture preferences
      this._updatePrefs(i, comps[bestIdx], bestScore);

      // update instance transform
      const dummy = new THREE.Object3D();
      dummy.position.copy(pos);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0), this.dir[i].clone().normalize());
      dummy.quaternion.copy(quat);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate=true;

    // update viz
    this.vizGeom.setDrawRange(0, segs*2);
    if (segs>0){
      this.vizGeom.getAttribute('position').needsUpdate = true;
      this.vizGeom.getAttribute('color').needsUpdate = true;
    }
    return {rewardAvg: rewardAvg/this.count};
  }
}

////////////////////////////////////////////////////////////////////////////////
// App
////////////////////////////////////////////////////////////////////////////////
const App={
  size: 22, // box size (edge length)
  scene:null, camera:null, renderer:null, controls:null,
  boxMesh:null, raycaster:null, pointer:new THREE.Vector2(),
  field:null, world:null, gen:null, critic:null, swarm:null,
  params:{
    gmode:'mixture', kappa:6, haarMix:0.15, sigT:0.12, props:6, showPrior:true,
    evolve:true, wGoal:1.0, wPlume:0.8, wRepel:1.2,
    flies:400, speed:1.0, tscale:1.0, clickMode:'attractor'
  },
  paused:false, t:0
};

function init(){
  const app=document.getElementById('app');
  const renderer=new THREE.WebGLRenderer({ antialias:true, alpha:false, logarithmicDepthBuffer:true });
  renderer.setSize(app.clientWidth, app.clientHeight);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0xffffff, 1.0);
  app.appendChild(renderer.domElement);

  const scene=new THREE.Scene();

  // Camera / controls
  const camera=new THREE.PerspectiveCamera(55, app.clientWidth/app.clientHeight, 0.1, 200);
  camera.position.set(0, 14, 28);
  const controls=new OrbitControls(camera, renderer.domElement);
  controls.target.set(0,0,0); controls.enableDamping=true; controls.dampingFactor=0.06;
  controls.minDistance=10; controls.maxDistance=80;

  // Lighting (soft studio)
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(18, 22, 12); key.castShadow=true;
  key.shadow.mapSize.set(2048,2048); key.shadow.camera.near=5; key.shadow.camera.far=80;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-16, 10, -14); scene.add(fill);
  const rim  = new THREE.DirectionalLight(0xffffff, 0.4); rim.position.set(0, 30, 0); scene.add(rim);

  // Box (wire) + invisible collider volume
  const boxGeo=new THREE.BoxGeometry(App.size, App.size, App.size);
  const edges=new THREE.EdgesGeometry(boxGeo);
  const boxLines=new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color:0x222222, linewidth:1, transparent:true, opacity:0.25 }));
  scene.add(boxLines);
  const boxMat=new THREE.MeshBasicMaterial({ color:0xffffff, opacity:0.0, transparent:true });
  const boxMesh=new THREE.Mesh(boxGeo, boxMat); scene.add(boxMesh);

  // Systems
  const field=new Field3D(32, App.size);
  const world=new World(App.size);
  const gen=new GeneratorSE3();
  const critic=new Critic(world, field, App.size);
  const swarm=new Swarm(scene, App.params.flies, App.size, gen, critic);

  Object.assign(App,{scene,camera,renderer,controls, boxMesh, field, world, gen, critic, swarm});
  App.raycaster=new THREE.Raycaster();

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  wireUI();
  syncParams();
  animate();
}

function toWorldPoint(intersect){
  return intersect.point.clone();
}

function onPointerDown(e){
  const rect=App.renderer.domElement.getBoundingClientRect();
  App.pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
  App.pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
  App.raycaster.setFromCamera(App.pointer, App.camera);
  const hits = App.raycaster.intersectObject(App.boxMesh);
  if(!hits.length) return;
  const p = toWorldPoint(hits[0]);
  const mode = App.params.clickMode;
  const shift = e.shiftKey;

  if (shift){
    // remove nearest object
    let best=null, bd=1e9, type=null, idx=-1;
    for (let i=0;i<App.world.attractors.length;i++){
      const a=App.world.attractors[i]; const d=a.pos.distanceTo(p);
      if(d<bd){ bd=d; best=a; type='a'; idx=i; }
    }
    for (let i=0;i<App.world.repellents.length;i++){
      const r=App.world.repellents[i]; const d=r.pos.distanceTo(p);
      if(d<bd){ bd=d; best=r; type='r'; idx=i; }
    }
    if (best){
      App.scene.remove(best.mesh); best.mesh.geometry.dispose(); best.mesh.material.dispose();
      if (type==='a') App.world.attractors.splice(idx,1); else App.world.repellents.splice(idx,1);
    }
    return;
  }

  if (mode==='attractor'){
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.35,18,14), new THREE.MeshStandardMaterial({ color:0xad8c00, emissive:0x352800, roughness:0.2, metalness:0.6 }));
    m.position.copy(p); m.castShadow=true; App.scene.add(m);
    App.world.attractors.push({pos:p.clone(), mesh:m});
  } else if (mode==='repellent'){
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.35,18,14), new THREE.MeshStandardMaterial({ color:0xcc2a2a, emissive:0x2a0000, roughness:0.3, metalness:0.2 }));
    m.position.copy(p); m.castShadow=true; App.scene.add(m);
    App.world.repellents.push({pos:p.clone(), mesh:m});
  } else if (mode==='plume'){
    App.field.addPlume(p, 1.0);
    // small visual puff
    const g=new THREE.SphereGeometry(0.6, 16, 12);
    const mat=new THREE.MeshBasicMaterial({ color:0x1e7aff, transparent:true, opacity:0.22 });
    const s=new THREE.Mesh(g,mat); s.position.copy(p);
    App.scene.add(s);
    // fade away
    const ttl=0.9; const start=performance.now();
    const tick=()=>{
      const t=(performance.now()-start)/1000;
      s.material.opacity = Math.max(0, 0.22*(1-t/ttl));
      s.scale.setScalar(1+1.2*t);
      if (t<ttl) requestAnimationFrame(tick); else { App.scene.remove(s); s.geometry.dispose(); s.material.dispose(); }
    };
    tick();
  }
}

function onResize(){
  const app = document.getElementById('app');
  App.renderer.setSize(app.clientWidth, app.clientHeight);
  App.camera.aspect = app.clientWidth/app.clientHeight;
  App.camera.updateProjectionMatrix();
}

function animate(){
  requestAnimationFrame(animate);
  if (!App.paused){
    const dt=0.016*App.params.tscale;
    App.t += dt;

    // step field
    App.field.step(dt);

    // sync generator / critic live params
    App.gen.kappa = App.params.kappa;
    App.gen.haarMix = App.params.haarMix;
    App.gen.sigmaT = App.params.sigT;
    App.gen.mode = App.params.gmode;
    App.swarm.propsPerStep = App.params.props|0;
    App.swarm.showPrior = App.params.showPrior;
    App.swarm.evolve = App.params.evolve;
    App.swarm.speedScale = App.params.speed;
    App.critic.wGoal = App.params.wGoal;
    App.critic.wPlume = App.params.wPlume;
    App.critic.wRepel = App.params.wRepel;

    // step swarm
    const {rewardAvg} = App.swarm.step(App.field, App.world, dt);

    // HUD
    const haarD = App.gen.haarDivYaw();
    document.getElementById('hud').textContent =
      `t=${App.t.toFixed(1)} | flies=${App.params.flies} | proposals=${App.params.props} | reward=${rewardAvg.toFixed(2)} | haarΔ(yaw)=${haarD.toFixed(2)}`;
  }
  App.controls.update();
  App.renderer.render(App.scene, App.camera);
}

////////////////////////////////////////////////////////////////////////////////
// UI
////////////////////////////////////////////////////////////////////////////////
function $(id){ return document.getElementById(id); }
function syncVal(id,fmt=(x)=>String(x)){ const v=$(id+'V'); if(v) v.textContent=fmt($(id).value); }
function bindRange(id, key, fmt){
  syncVal(id,fmt);
  $(id).addEventListener('input', ()=>{
    const val = (id==='props' || id==='flies') ? parseInt($(id).value,10) : parseFloat($(id).value);
    App.params[key]=val; 
    if (id==='kappa') syncVal(id, v=>parseFloat(v).toFixed(1));
    else if (id==='mix' || id==='sigT' || id==='speed' || id==='tscale') syncVal(id, v=>parseFloat(v).toFixed(2));
    else syncVal(id, v=>String(parseInt(v,10)));
    if (id==='flies'){ rebuildSwarm(); }
  });
}
function rebuildSwarm(){
  // dispose old
  App.scene.remove(App.swarm.mesh); App.scene.remove(App.swarm.viz);
  App.swarm.mesh.geometry?.dispose(); App.swarm.mesh.material?.dispose();
  App.swarm.viz.geometry?.dispose(); App.swarm.viz.material?.dispose();
  App.swarm = new Swarm(App.scene, App.params.flies, App.size, App.gen, App.critic);
  App.swarm.showPrior = App.params.showPrior;
  App.swarm.propsPerStep = App.params.props;
}
function wireUI(){
  $('gmode').addEventListener('change',(e)=>{ App.params.gmode=e.target.value; });
  bindRange('kappa','kappa', v=>parseFloat(v).toFixed(1));
  bindRange('mix','haarMix', v=>parseFloat(v).toFixed(2));
  bindRange('props','props', v=>String(parseInt(v,10)));
  bindRange('sigT','sigT', v=>parseFloat(v).toFixed(2));
  $('showPrior').addEventListener('change',(e)=>{ App.params.showPrior=e.target.checked; });

  $('evolve').addEventListener('change',(e)=>{ App.params.evolve=e.target.checked; });
  bindRange('wGoal','wGoal', v=>parseFloat(v).toFixed(2));
  bindRange('wPlume','wPlume', v=>parseFloat(v).toFixed(2));
  bindRange('wRepel','wRepel', v=>parseFloat(v).toFixed(2));

  bindRange('flies','flies', v=>String(parseInt(v,10)));
  bindRange('speed','speed', v=>parseFloat(v).toFixed(2));
  bindRange('tscale','tscale', v=>parseFloat(v).toFixed(2));

  $('clickMode').addEventListener('change',(e)=>{ App.params.clickMode=e.target.value; });
  $('clearAll').addEventListener('click', ()=>{
    App.world.clear(App.scene);
    App.field.A.fill(0); App.field.plumes.length=0;
  });
  $('pause').addEventListener('click', (e)=>{
    App.paused = !App.paused; e.target.textContent = App.paused? 'Resume' : 'Pause';
  });

  $('toggleHelp').addEventListener('click', ()=>{
    const el=$('help'); el.style.display = (el.style.display==='none' || el.style.display==='')? 'block' : 'none';
  });
}
function syncParams(){
  $('gmode').value=App.params.gmode;
  $('evolve').checked=App.params.evolve;
  $('showPrior').checked=App.params.showPrior;
  $('clickMode').value=App.params.clickMode;
  ['kappa','mix','props','sigT','flies','speed','tscale','wGoal','wPlume','wRepel'].forEach(id=>{
    const key = ({kappa:'kappa',mix:'haarMix',props:'props',sigT:'sigT',flies:'flies',speed:'speed',tscale:'tscale', wGoal:'wGoal',wPlume:'wPlume',wRepel:'wRepel'})[id];
    const el=$(id); if(!el) return; el.value = App.params[key];
    el.dispatchEvent(new Event('input'));
  });
}

// Initialize when this specific post loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>