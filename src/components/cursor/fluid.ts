/*
 * A compact stable-fluids simulation (WebGL2): advection, curl/vorticity, pressure solve.
 * The cursor stirs it; clicks drop a splash. It blends over the page like ink in water.
 * Modelled on the classic GPU fluid approach (Stam / Dobryakov), written fresh for this site.
 */

type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number; attach: (id: number) => number };
type DoubleFBO = { read: FBO; write: FBO; swap: () => void; w: number; h: number };

const VERT = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
uniform vec2 texel;
void main(){
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = {
  splat: `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D target; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
void main(){
  vec2 p = vUv - point; p.x *= aspect;
  vec3 s = exp(-dot(p,p) / radius) * color;
  o = vec4(texture(target, vUv).xyz + s, 1.0);
}`,
  advect: `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D vel; uniform sampler2D src; uniform vec2 texel; uniform float dt; uniform float dissipation;
void main(){
  vec2 coord = vUv - dt * texture(vel, vUv).xy * texel;
  o = texture(src, coord) / (1.0 + dissipation * dt);
}`,
  divergence: `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
uniform sampler2D vel;
void main(){
  float L = texture(vel, vL).x, R = texture(vel, vR).x, T = texture(vel, vT).y, B = texture(vel, vB).y;
  vec2 C = texture(vel, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
uniform sampler2D vel;
void main(){
  float L = texture(vel, vL).y, R = texture(vel, vR).y, T = texture(vel, vT).x, B = texture(vel, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  vorticity: `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
uniform sampler2D vel; uniform sampler2D curl; uniform float strength; uniform float dt;
void main(){
  float L = texture(curl, vL).x, R = texture(curl, vR).x, T = texture(curl, vT).x, B = texture(curl, vB).x, C = texture(curl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 0.0001; f *= strength * C; f.y *= -1.0;
  vec2 v = texture(vel, vUv).xy + f * dt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`,
  pressure: `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
uniform sampler2D pressure; uniform sampler2D divergence;
void main(){
  float L = texture(pressure, vL).x, R = texture(pressure, vR).x, T = texture(pressure, vT).x, B = texture(pressure, vB).x;
  float d = texture(divergence, vUv).x;
  o = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: `#version 300 es
precision highp float;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
uniform sampler2D pressure; uniform sampler2D vel;
void main(){
  float L = texture(pressure, vL).x, R = texture(pressure, vR).x, T = texture(pressure, vT).x, B = texture(pressure, vB).x;
  vec2 v = texture(vel, vUv).xy - vec2(R - L, T - B);
  o = vec4(v, 0.0, 1.0);
}`,
  scale: `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D src; uniform float value;
void main(){ o = value * texture(src, vUv); }`,
  display: `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D dye;
void main(){
  vec3 d = texture(dye, vUv).rgb;
  float a = clamp(max(d.r, max(d.g, d.b)), 0.0, 1.0);
  vec3 col = d / max(a, 0.001);
  // White where there is no dye: the canvas is multiplied over the page, so white is invisible.
  o = vec4(mix(vec3(1.0), col, smoothstep(0.0, 1.0, a) * 0.9), 1.0);
}`,
};

// Dye tints: clinical aqua, lime, a soft coral from the logo red. Multiplied, they read as water.
const PALETTE: [number, number, number][] = [
  [0.25, 0.78, 0.74],
  [0.83, 0.95, 0.42],
  [0.97, 0.55, 0.6],
  [0.45, 0.82, 0.95],
];

export class Fluid {
  private gl: WebGL2RenderingContext;
  private progs: Record<string, { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }> = {};
  private vel!: DoubleFBO;
  private dye!: DoubleFBO;
  private pressure!: DoubleFBO;
  private div!: FBO;
  private curlFbo!: FBO;
  private colorIdx = 0;
  private lastSplatTime = 0;
  running = false;

  static create(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: false });
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) return null;
    gl.getExtension("OES_texture_float_linear");
    return new Fluid(gl, canvas);
  }

  private constructor(gl: WebGL2RenderingContext, private canvas: HTMLCanvasElement) {
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    for (const [name, src] of Object.entries(FRAG)) this.progs[name] = this.compile(src);
    this.resize();
  }

  private compile(frag: string) {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    const u: Record<string, WebGLUniformLocation | null> = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i)!;
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  private fbo(w: number, h: number, internal: number, format: number): FBO {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      tex,
      fbo,
      w,
      h,
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        return id;
      },
    };
  }

  private double(w: number, h: number, internal: number, format: number): DoubleFBO {
    let a = this.fbo(w, h, internal, format);
    let b = this.fbo(w, h, internal, format);
    const d: DoubleFBO = {
      w,
      h,
      get read() {
        return a;
      },
      get write() {
        return b;
      },
      swap() {
        [a, b] = [b, a];
      },
    } as DoubleFBO;
    return d;
  }

  resize() {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(window.innerWidth * dpr * 0.5);
    this.canvas.height = Math.round(window.innerHeight * dpr * 0.5);
    const aspect = window.innerWidth / window.innerHeight;
    const res = (base: number) => (aspect > 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)]);
    const [sw, sh] = res(128);
    const [dw, dh] = res(384);
    this.vel = this.double(sw, sh, gl.RG16F, gl.RG);
    this.pressure = this.double(sw, sh, gl.R16F, gl.RED);
    this.div = this.fbo(sw, sh, gl.R16F, gl.RED);
    this.curlFbo = this.fbo(sw, sh, gl.R16F, gl.RED);
    this.dye = this.double(dw, dh, gl.RGBA16F, gl.RGBA);
  }

  private blit(target: FBO | null) {
    const gl = this.gl;
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  private use(name: string, texel?: [number, number]) {
    const pr = this.progs[name];
    this.gl.useProgram(pr.p);
    if (texel && pr.u.texel) this.gl.uniform2f(pr.u.texel, texel[0], texel[1]);
    return pr.u;
  }

  /** Inject velocity and dye at a point (0..1, origin bottom-left). */
  splat(x: number, y: number, dx: number, dy: number, intensity = 1, radius = 0.0022) {
    const gl = this.gl;
    const aspect = this.canvas.width / this.canvas.height;
    const now = performance.now();
    if (now - this.lastSplatTime > 140) this.colorIdx = (this.colorIdx + 1) % PALETTE.length;
    this.lastSplatTime = now;
    const c = PALETTE[this.colorIdx];

    let u = this.use("splat", [1 / this.vel.w, 1 / this.vel.h]);
    gl.uniform1i(u.target, this.vel.read.attach(0));
    gl.uniform1f(u.aspect, aspect);
    gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, dx, dy, 0);
    gl.uniform1f(u.radius, radius);
    this.blit(this.vel.write);
    this.vel.swap();

    u = this.use("splat", [1 / this.dye.w, 1 / this.dye.h]);
    gl.uniform1i(u.target, this.dye.read.attach(0));
    gl.uniform1f(u.aspect, aspect);
    gl.uniform2f(u.point, x, y);
    gl.uniform3f(u.color, c[0] * 0.32 * intensity, c[1] * 0.32 * intensity, c[2] * 0.32 * intensity);
    gl.uniform1f(u.radius, radius * 1.4);
    this.blit(this.dye.write);
    this.dye.swap();
  }

  step(dt: number) {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    const vt: [number, number] = [1 / this.vel.w, 1 / this.vel.h];

    let u = this.use("curl", vt);
    gl.uniform1i(u.vel, this.vel.read.attach(0));
    this.blit(this.curlFbo);

    u = this.use("vorticity", vt);
    gl.uniform1i(u.vel, this.vel.read.attach(0));
    gl.uniform1i(u.curl, this.curlFbo.attach(1));
    gl.uniform1f(u.strength, 22);
    gl.uniform1f(u.dt, dt);
    this.blit(this.vel.write);
    this.vel.swap();

    u = this.use("divergence", vt);
    gl.uniform1i(u.vel, this.vel.read.attach(0));
    this.blit(this.div);

    u = this.use("scale", vt);
    gl.uniform1i(u.src, this.pressure.read.attach(0));
    gl.uniform1f(u.value, 0.8);
    this.blit(this.pressure.write);
    this.pressure.swap();

    u = this.use("pressure", vt);
    gl.uniform1i(u.divergence, this.div.attach(0));
    for (let i = 0; i < 18; i++) {
      gl.uniform1i(u.pressure, this.pressure.read.attach(1));
      this.blit(this.pressure.write);
      this.pressure.swap();
    }

    u = this.use("gradient", vt);
    gl.uniform1i(u.pressure, this.pressure.read.attach(0));
    gl.uniform1i(u.vel, this.vel.read.attach(1));
    this.blit(this.vel.write);
    this.vel.swap();

    u = this.use("advect", vt);
    gl.uniform1i(u.vel, this.vel.read.attach(0));
    gl.uniform1i(u.src, this.vel.read.attach(0));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, 0.9);
    this.blit(this.vel.write);
    this.vel.swap();

    u = this.use("advect", vt);
    gl.uniform1i(u.vel, this.vel.read.attach(0));
    gl.uniform1i(u.src, this.dye.read.attach(1));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, 1.6);
    this.blit(this.dye.write);
    this.dye.swap();

    u = this.use("display");
    gl.uniform1i(u.dye, this.dye.read.attach(0));
    this.blit(null);
  }

  dispose() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
