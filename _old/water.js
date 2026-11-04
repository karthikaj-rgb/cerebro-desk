// The desk's surface: woven paper that behaves like water. Touch it and it ripples; the weave bends
// with the wave and a little light rides the crest. One full-screen WebGL layer under the cards.
const VS = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`
const FS = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uDrops[32];
uniform vec3 uPaper;
uniform vec3 uThread;
uniform vec3 uLight;
uniform float uWeave;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 disp = vec2(0.0);
  float crest = 0.0;
  for (int i = 0; i < 32; i++) {
    vec4 d = uDrops[i];
    if (d.w <= 0.0) continue;
    float age = uTime - d.z;
    if (age < 0.0 || age > 3.2) continue;
    vec2 v = p - d.xy;
    float r = length(v);
    float front = age * 240.0;
    float k = r - front;
    float width = 34.0 + age * 30.0;
    float env = exp(-k * k / (2.0 * width * width)) * exp(-age * 1.5) * d.w;
    float s = sin(k * 0.11);
    disp += (v / max(r, 1.0)) * s * env * 7.0;
    crest += s * env;
  }
  vec2 q = p + disp;
  // The weave: threads every few px, alternating which one lies on top.
  float w = uWeave;
  vec2 cell = floor(q / w);
  float over = mod(cell.x + cell.y, 2.0);
  float tx = abs(fract(q.x / w) - 0.5) * 2.0;
  float ty = abs(fract(q.y / w) - 0.5) * 2.0;
  float gap = mix(smoothstep(0.55, 0.95, tx), smoothstep(0.55, 0.95, ty), over);
  float n = hash(cell);
  vec3 col = mix(uThread, uPaper, gap);
  col *= 0.985 + 0.03 * n;
  // Light rides the crest; the trough shades a touch. Gentle, so it reads as water, not a stain.
  col *= 1.0 + crest * 0.07;
  col += uLight * max(crest, 0.0) * 0.1;
  gl_FragColor = vec4(col, 1.0);
}`

export function createWater(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
  if (!gl) return null
  const sh = (t, s) => {
    const o = gl.createShader(t)
    gl.shaderSource(o, s)
    gl.compileShader(o)
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o))
    return o
  }
  const prog = gl.createProgram()
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const a = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(a)
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
  const U = (n) => gl.getUniformLocation(prog, n)
  const u = { res: U('uRes'), time: U('uTime'), drops: U('uDrops'), paper: U('uPaper'), thread: U('uThread'), light: U('uLight'), weave: U('uWeave') }

  const DPR = Math.min(1.5, devicePixelRatio || 1)
  const drops = new Float32Array(32 * 4)
  let next = 0
  let colors = { paper: [0.96, 0.96, 0.97], thread: [0.9, 0.9, 0.92], light: [1, 1, 1] }
  const t0 = performance.now()
  const now = () => (performance.now() - t0) / 1000
  let last = 0

  function fit() {
    canvas.width = Math.round(innerWidth * DPR)
    canvas.height = Math.round(innerHeight * DPR)
    canvas.style.width = `${innerWidth}px`
    canvas.style.height = `${innerHeight}px`
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  fit()
  addEventListener('resize', fit)

  function frame() {
    const t = now()
    gl.uniform2f(u.res, canvas.width, canvas.height)
    gl.uniform1f(u.time, t)
    gl.uniform4fv(u.drops, drops)
    gl.uniform3fv(u.paper, colors.paper)
    gl.uniform3fv(u.thread, colors.thread)
    gl.uniform3fv(u.light, colors.light)
    gl.uniform1f(u.weave, 4.0 * DPR)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  const hex = (h) => {
    const v = h.trim().replace('#', '')
    const n = parseInt(v.length === 3 ? v.replace(/(.)/g, '$1$1') : v, 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  }
  return {
    /** A touch at (x, y) in CSS px. strength 0..1. */
    drop(x, y, strength = 0.5) {
      const t = now()
      // Pointer moves come fast; keep them gentle and spaced.
      if (strength < 0.5 && t - last < 0.045) return
      last = t
      drops.set([x * DPR, y * DPR, t, strength], next * 4)
      next = (next + 1) % 32
    },
    /** Colours from the theme: paper, thread (slightly darker/lighter), crest light. */
    theme({ paper, thread, light }) {
      colors = { paper: hex(paper), thread: hex(thread), light: hex(light) }
    },
  }
}
