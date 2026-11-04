// The AI's presence in V2: one renderer per style, drawn once a frame and copied into every place the
// AI appears (room, chat avatars, phone sheet, empty state). Styles are ported from mockups/ai-presence*.html.
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const V1=[91,91,214], V2=[157,140,255];
const TAU=Math.PI*2;
const S={reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
/* ---------- helpers ---------- */
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const mix=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function rgba(c,a){return 'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+clamp(a,0,1).toFixed(3)+')'}
function mixc(a,b,t){return [mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)]}
function rand(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296}}
function canvas2d(canvas,w,h){canvas.width=Math.round(w*DPR);canvas.height=Math.round(h*DPR)}

function program(gl,vs,fs){
  const p=gl.createProgram();
  [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]].forEach(([t,src])=>{
    const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p,s);
  });
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function locs(gl,p,names){const u={};names.forEach(n=>u[n]=gl.getUniformLocation(p,n));return u}
function fib(n){const o=[];for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),t=i*2.399963;o.push([Math.cos(t)*r,y,Math.sin(t)*r])}return o}
function glCtx(c){const o={alpha:true,premultipliedAlpha:true,antialias:true,powerPreference:'high-performance'};return c.getContext('webgl',o)||c.getContext('experimental-webgl',o)}
/* ---------- particle swarm, liquid chrome (round one) ---------- */
const SWARM_VS=`
attribute vec3 aDir; attribute vec2 aSeed;
uniform float uT,uAmp,uHover,uR,uPx; uniform vec4 uW; uniform vec2 uPtr,uRes;
varying float vA; varying float vC; varying float vG;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){
  vec3 d=aDir; float s=aSeed.x, s2=aSeed.y, t=uT;
  float n=sin(d.x*3.1+t*.7)*sin(d.y*2.7-t*.6)*sin(d.z*3.3+t*.5);
  float shell=1.+(s2-.5)*.12;
  vec3 pI=d*(shell+.08*n+.06*uAmp);
  vec3 L=normalize(vec3(uPtr*uHover,1.1));
  float face=max(dot(d,L),0.);
  vec3 pL=d*(.8+(s2-.5)*.04+.20*pow(face,6.)*(.35+uHover)+.30*uAmp*pow(face,2.)+.03*n);
  float th=atan(d.z,d.x)+t*(1.3+1.1*s);
  float ph=asin(clamp(d.y,-1.,1.))*2.+t*1.7;
  float R=.68, r=.24+.06*sin(th*3.+t*2.)+(s2-.5)*.08;
  vec3 pT=vec3((R+r*cos(ph))*cos(th), r*sin(ph), (R+r*cos(ph))*sin(th));
  pT.yz*=rot(.6); pT.xy*=rot(.3);
  float wave=sin(d.y*9.-t*10.+s*.6)*.5+sin(atan(d.z,d.x)*5.+t*6.)*.5;
  vec3 pS=d*(.9+uAmp*(.32+.18*wave)+.03*n+(s2-.5)*.06);
  vec3 p=pI*uW.x+pL*uW.y+pT*uW.z+pS*uW.w;
  p.xz*=rot(t*.22+uPtr.x*.5*uHover);
  p.yz*=rot(.2-uPtr.y*.4*uHover);
  float z=3.6-p.z, k=3.6/z;
  vec2 sp=p.xy*k;
  gl_Position=vec4(sp*uR/(uRes*.5),0.,1.);
  float depth=clamp(p.z*.5+.5,0.,1.);
  gl_PointSize=uPx*(.7+1.3*depth)*k;
  vec2 dp=sp-uPtr;
  float near=uHover*exp(-dot(dp,dp)*4.);
  vA=(.22+.78*depth)*(1.+near*.9);
  vC=depth; vG=smoothstep(.82,1.,s2)+near*.6;
}`;
const SWARM_FS=`
precision mediump float;
varying float vA; varying float vC; varying float vG; uniform float uDark;
void main(){
  vec2 q=gl_PointCoord-.5; float d=length(q);
  float a=smoothstep(.5,.12,d)*vA;
  vec3 c3=vec3(.48,.7,1.);
  vec3 lc=mix(vec3(.66,.6,1.),vec3(.28,.28,.76),vC); lc=mix(lc,c3*.85,vG*.35);
  vec3 dc=mix(vec3(.36,.34,.86),vec3(.86,.83,1.),vC); dc=mix(dc,c3,vG*.3);
  vec3 col=mix(lc,dc,uDark);
  a*=mix(.7,.6,uDark);
  gl_FragColor=vec4(col*a,a);
}`;
function Swarm(canvas,mini){
  const gl=glCtx(canvas); if(!gl)throw new Error('WebGL unavailable');
  const p=program(gl,SWARM_VS,SWARM_FS);
  const N=mini?1600:4200, r=rand(mini?7:11), data=new Float32Array(N*5);
  for(let i=0;i<N;i++){
    let x,y,z,l;do{x=r()*2-1;y=r()*2-1;z=r()*2-1;l=x*x+y*y+z*z}while(l>1||l<1e-3);
    l=Math.sqrt(l);data.set([x/l,y/l,z/l,r(),r()],i*5);
  }
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  gl.useProgram(p);
  const aD=gl.getAttribLocation(p,'aDir'),aS=gl.getAttribLocation(p,'aSeed');
  gl.enableVertexAttribArray(aD);gl.vertexAttribPointer(aD,3,gl.FLOAT,false,20,0);
  gl.enableVertexAttribArray(aS);gl.vertexAttribPointer(aS,2,gl.FLOAT,false,20,12);
  const u=locs(gl,p,['uT','uAmp','uHover','uR','uPx','uW','uPtr','uRes','uDark']);
  gl.enable(gl.BLEND);
  const me={R:1,resize(w,h){this.w=w;this.h=h;canvas.width=Math.round(w*DPR);canvas.height=Math.round(h*DPR);this.R=Math.min(w,h)*(mini?.36:.31)},
  draw(P){
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    if(P.dark>.5)gl.blendFuncSeparate(gl.ONE,gl.ONE,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);else gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(u.uT,P.t);gl.uniform1f(u.uAmp,P.amp);gl.uniform1f(u.uHover,P.hover);
    gl.uniform1f(u.uR,this.R*DPR);gl.uniform1f(u.uPx,(mini?1.25:1.9)*DPR);
    gl.uniform4fv(u.uW,P.W);gl.uniform2f(u.uPtr,P.px,-P.py);gl.uniform2f(u.uRes,canvas.width,canvas.height);gl.uniform1f(u.uDark,P.dark);
    gl.drawArrays(gl.POINTS,0,N);
  }};
  return me;
}

/* =========================================================
   Shared raymarch scaffolding (B chrome, E ferrofluid)
   ========================================================= */
const QUAD_VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const RM_COMMON=`
precision highp float;
uniform vec2 uRes,uPtr; uniform float uT,uAmp,uHover,uDark,uR; uniform vec4 uW;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec3 studio(vec3 r){
  float sb=smoothstep(.62,.7,r.y)*smoothstep(.75,.45,abs(r.x+.15))*smoothstep(.9,.5,abs(r.z-.2));
  float sr=smoothstep(.78,.86,r.x)*smoothstep(.55,.3,abs(r.y-.1));
  float sl=smoothstep(.85,.93,-r.x)*smoothstep(.4,.2,abs(r.y-.25));
  return vec3(1.)*(sb*2.4+sr*1.5)+vec3(.62,.58,1.)*sl*1.1;
}`;
function RayInst(canvas,mini,fs,extraNames,fit,setExtra,scale){
  const gl=glCtx(canvas); if(!gl)throw new Error('WebGL unavailable');
  const p=program(gl,QUAD_VS,fs);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  gl.useProgram(p);const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const u=locs(gl,p,['uRes','uPtr','uT','uAmp','uHover','uDark','uR','uW'].concat(extraNames||[]));
  const rs=mini?DPR:Math.min(DPR,scale);
  return {R:1,resize(w,h){canvas.width=Math.round(w*rs);canvas.height=Math.round(h*rs);this.R=Math.min(w,h)*fit},
  draw(P){
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(u.uRes,canvas.width,canvas.height);gl.uniform2f(u.uPtr,P.px,-P.py);
    gl.uniform1f(u.uT,P.t);gl.uniform1f(u.uAmp,P.amp);gl.uniform1f(u.uHover,P.hover);gl.uniform1f(u.uDark,P.dark);
    gl.uniform1f(u.uR,this.R*rs);gl.uniform4fv(u.uW,P.W);
    if(setExtra)setExtra(gl,u,P);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }};
}

/* =========================================================
   B · Liquid chrome
   ========================================================= */
const CHROME_FS=RM_COMMON+`
float map(vec3 p){
  float t=uT;
  p.xy-=uPtr*.14*uHover*(.3+uW.y);
  p.xz*=rot(p.y*1.5*uW.z+t*.12);
  float r=.78-.07*uW.y+.07*uAmp*uW.w;
  float d=length(p)-r;
  float f=2.4+1.3*uW.w+.9*uW.z;
  float n=sin(f*p.x+t*.9)*sin(f*p.y+t*1.13+1.)*sin(f*p.z+t*.71+2.);
  d+=n*(.05+.035*uW.z+.02*uW.y+.17*uAmp*uW.w);
  d+=sin(12.*length(p.xy)-t*9.)*.016*uAmp*uW.w;
  vec3 L=normalize(vec3(uPtr,1.3));
  d-=.13*uW.y*(.35+.65*uHover)*pow(max(dot(normalize(p),L),0.),5.);
  if(uW.z>.02){
    for(int i=0;i<3;i++){
      float a=t*1.7+float(i)*2.0944;
      vec3 c=vec3(cos(a)*.98,sin(a*1.4+float(i))*.3,sin(a)*.98)*uW.z;
      d=smin(d,length(p-c)-.16*uW.z,.32);
    }
  }
  return d;
}
vec3 nrm(vec3 p){vec2 e=vec2(.0015,-.0015);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
vec3 env(vec3 r){
  vec3 top=mix(vec3(.96,.96,.985),vec3(.14,.14,.19),uDark);
  vec3 bot=mix(vec3(.6,.6,.68),vec3(.03,.03,.045),uDark);
  vec3 c=mix(bot,top,smoothstep(-.5,.7,r.y));
  c*=1.-mix(.62,.5,uDark)*exp(-pow((r.y+.04)*5.,2.));
  c+=studio(r)*mix(.9,1.2,uDark);
  c+=vec3(.36,.36,.84)*.5*smoothstep(.2,1.,dot(r,normalize(vec3(0.,-.85,.4))));
  return c;
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uR;
  vec3 ro=vec3(0.,0.,4.), rd=normalize(vec3(uv,-3.9));
  float sh=exp(-pow(uv.x/.75,2.)-pow((uv.y+1.06)/.085,2.));
  vec4 bg=mix(vec4(vec3(.12,.12,.25)*.16,.16)*sh,vec4(vec3(.36,.34,.85)*.22,.22)*sh,uDark);
  float b=dot(ro,rd), c=dot(ro,ro)-2.56, h=b*b-c;
  if(h<0.){gl_FragColor=bg;return;}
  float t=-b-sqrt(h), tmax=-b+sqrt(h), md=1e9, tm=t; bool hit=false;
  for(int i=0;i<80;i++){
    vec3 p=ro+rd*t; float d=map(p);
    if(d<md){md=d;tm=t;}
    if(d<.001){hit=true;break;}
    t+=d*.8; if(t>tmax)break;
  }
  float px=1.6/uR;
  float a=hit?1.:clamp(1.-md/px,0.,1.);
  if(a<=0.){gl_FragColor=bg;return;}
  vec3 p=ro+rd*(hit?t:tm), n=nrm(p), r=reflect(rd,n);
  float fr=pow(1.-max(dot(n,-rd),0.),3.);
  vec3 col=env(r)*vec3(.93,.94,1.);
  vec3 iri=mix(vec3(.357,.357,.839),vec3(.616,.549,1.),.5+.5*sin(dot(n,vec3(2.,3.,1.))*1.6+uT*.5));
  col=mix(col,iri*mix(1.05,1.3,uDark),fr*.7);
  col+=vec3(.62,.58,1.)*uAmp*uW.w*.12*fr;
  gl_FragColor=vec4(col,1.)*a+bg*(1.-a);
}`;
function Chrome(canvas,mini){return RayInst(canvas,mini,CHROME_FS,[],mini?.42:.38,null,1.25)}
/* ---------- cymatics, culture (round two) ---------- */
function Cymatics(canvas,mini){
  const ctx=canvas.getContext('2d');
  const N=mini?1700:6000, r=rand(mini?3:4);
  const X=new Float32Array(N),Y=new Float32Array(N),M=new Uint8Array(N);
  for(let i=0;i<N;i++){const a=r()*TAU,d=Math.sqrt(r())*.98;X[i]=Math.cos(a)*d;Y[i]=Math.sin(a)*d}
  // [n, m, sign]
  const MODES=[[1,3,-1],[2,4,1],[3,5,-1],[1,5,1],[2,6,-1],[3,5,1],[1,7,-1],[4,6,1],[3,7,-1],[2,8,1],[5,7,-1]];
  const IDLE=2, SPEAK=mini?[1,3,4,5,6]:[3,4,5,6,7,8,9,10], THINK=mini?[2,1,5,3,4,0]:[2,4,7,3,9,5,1];
  let ma=IDLE,mb=IDLE,k=1,tgt=IDLE,lastPh=-1,thinkT=0,thinkI=0,rot=0;
  const H=Math.PI/2;
  function field(md,x,y,o){
    const n=md[0],m=md[1],s=md[2],u=(x+1)*H,v=(y+1)*H;
    const cnu=Math.cos(n*u),snu=Math.sin(n*u),cmu=Math.cos(m*u),smu=Math.sin(m*u);
    const cnv=Math.cos(n*v),snv=Math.sin(n*v),cmv=Math.cos(m*v),smv=Math.sin(m*v);
    o[0]=cnu*cmv+s*cmu*cnv;
    o[1]=H*(-n*snu*cmv-s*m*smu*cnv);
    o[2]=H*(-m*cnu*smv-s*n*cmu*snv);
  }
  const fa=[0,0,0],fb=[0,0,0];
  function physics(P){
    const W=P.W,dt=P.dt,amp=P.amp;
    // which mode the plate is driven at
    if(W[2]>.5){thinkT+=dt;if(thinkT>2.8){thinkT=0;thinkI=(thinkI+1)%THINK.length}tgt=THINK[thinkI]}
    else{thinkT=2.8;
      const voiced=W[3]>.5||(W[1]>.5&&S.mic);
      if(voiced){if(P.phrase!==lastPh){lastPh=P.phrase;tgt=SPEAK[Math.floor(P.pitch*SPEAK.length*.999)]}}
      else{tgt=IDLE;lastPh=P.phrase}
    }
    if(tgt!==mb){if(k>=1){ma=mb;mb=tgt;k=0}else if(k<.3){mb=tgt}}
    k=Math.min(1,k+dt*(W[2]>.5?.45:2.2));
    const e=k*k*(3-2*k), ea=1-e;
    const A=MODES[ma],B=MODES[mb];
    rot+=dt*(.025+.12*W[2]);
    const cr=Math.cos(rot),sr=Math.sin(rot);
    const base=W[0]*.011+W[1]*(.05+.06*amp)+W[2]*.02+W[3]*(.014+.03*amp);
    const vib=W[0]*.07+W[1]*.08+W[2]*.08+W[3]*(.05+.5*amp*amp);
    const settle=W[0]*4+W[1]*1.4+W[2]*2.4+W[3]*3.6;
    const sq=Math.sqrt(Math.max(dt,1e-4)), kS=1-Math.exp(-dt*settle);
    const hx=P.px,hy=P.py,hov=P.hover*(.5+.5*W[1]);
    for(let i=0;i<N;i++){
      let x=X[i],y=Y[i];
      const xr=x*cr+y*sr, yr=-x*sr+y*cr;
      field(A,xr,yr,fa);
      let f=fa[0],gxr=fa[1],gyr=fa[2];
      if(ea<.999){field(B,xr,yr,fb);f=f*ea+fb[0]*e;gxr=gxr*ea+fb[1]*e;gyr=gyr*ea+fb[2]*e}
      const gx=gxr*cr-gyr*sr, gy=gxr*sr+gyr*cr, g2=gx*gx+gy*gy+.02;
      let sx=-f*gx/g2, sy=-f*gy/g2; const sl=Math.hypot(sx,sy); if(sl>.08){sx*=.08/sl;sy*=.08/sl}
      const af=Math.abs(f), j=(base+vib*af)*sq;
      x+=sx*kS+(Math.random()-.5)*j*2.4; y+=sy*kS+(Math.random()-.5)*j*2.4;
      if(hov>.01){const dx=x-hx,dy=y-hy,d=Math.hypot(dx,dy);if(d<.26&&d>1e-4){const p=(.26-d)*hov*dt*4;x+=dx/d*p;y+=dy/d*p}}
      const rr=x*x+y*y;if(rr>.96){const q=.98/Math.sqrt(rr);x*=q*.995;y*=q*.995}
      X[i]=x;Y[i]=y;M[i]=af<.12?0:af<.4?1:2;
    }
  }
  {const Q={W:[1,0,0,0],dt:1/60,amp:0,px:0,py:0,hover:0,phrase:0,pitch:.5};for(let i=0;i<110;i++)physics(Q)}
  return {R:1,resize(w,h){canvas2d(canvas,w,h);this.R=Math.min(w,h)*(mini?.42:.41)},
  draw(P){
    physics(P);
    const W=P.W,t=P.t,amp=P.amp,dk=P.dark,w=canvas.width,h=canvas.height,R=this.R*DPR,cx=w/2,cy=h/2;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
    // plate
    ctx.fillStyle=dk>.5?'rgba(255,255,255,.028)':'rgba(30,30,90,.035)';
    ctx.beginPath();ctx.arc(cx,cy,R*1.04,0,TAU);ctx.fill();
    ctx.strokeStyle=dk>.5?'rgba(200,195,255,.12)':'rgba(30,30,90,.08)';ctx.lineWidth=DPR*.8;ctx.stroke();
    const sz=(mini?1.05:1.3)*DPR, hs=sz/2;
    const inkL=[64,64,190], inkD=[205,198,255];
    const ink=mixc(inkL,inkD,dk);
    const alphas=[.9,.5,.22];
    for(let b=0;b<3;b++){
      ctx.fillStyle=rgba(b===0?ink:mixc(ink,dk>.5?V2:V1,.5),alphas[b]*(mini&&b===0?1:1));
      ctx.beginPath();
      for(let i=0;i<N;i++)if(M[i]===b)ctx.rect(cx+X[i]*R-hs,cy+Y[i]*R-hs,sz,sz);
      ctx.fill();
    }
    // the driver at the centre of the plate
    ctx.fillStyle=rgba(dk>.5?V2:V1,.55+.4*amp*W[3]);
    ctx.beginPath();ctx.arc(cx,cy,(mini?1.6:2.6)*DPR*(1+.6*amp*W[3]),0,TAU);ctx.fill();
  }};
}

/* =========================================================
   B · The team (Canvas 2D): 27 agents with trails
   ========================================================= */
const RD_SIM=`
precision highp float;
uniform sampler2D uS; uniform vec2 uPx; uniform float uGrid,uF,uK,uT,uInit,uSeed,uCore,uClear,uAuto,uRot; uniform vec2 uPtr,uAutoP;
float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy*uPx; vec2 p=uv*2.-1.; float r=length(p);
  if(uInit>.5){
    vec2 g=floor(uv*uGrid), f=fract(uv*uGrid);
    float v=(hsh(g)>.55&&length(f-.5)<.3&&length(p)<.85)?1.:0.;
    gl_FragColor=vec4(1.-.5*v,.25*v,0.,1.);return;
  }
  // a very slow turn of the dish
  float cr=cos(uRot),sr=sin(uRot);
  vec2 q=vec2(cr*p.x-sr*p.y,sr*p.x+cr*p.y)*.5+.5;
  vec2 c=texture2D(uS,q).xy;
  vec2 l=-c+.2*(texture2D(uS,q+vec2(uPx.x,0.)).xy+texture2D(uS,q-vec2(uPx.x,0.)).xy+texture2D(uS,q+vec2(0.,uPx.y)).xy+texture2D(uS,q-vec2(0.,uPx.y)).xy)
     +.05*(texture2D(uS,q+uPx).xy+texture2D(uS,q-uPx).xy+texture2D(uS,q+vec2(uPx.x,-uPx.y)).xy+texture2D(uS,q+vec2(-uPx.x,uPx.y)).xy);
  float u=c.x,v=c.y,uvv=u*v*v;
  float F=uF+.004*sin(p.x*2.7+uT*.11)*cos(p.y*2.3-uT*.09);
  u+=1.0*l.x-uvv+F*(1.-u);
  v+=.5*l.y+uvv-(F+uK)*v;
  float dp=length(p-uPtr); if(dp<.06){v=mix(v,.5,uSeed);u=mix(u,.4,uSeed);}
  float da=length(p-uAutoP); if(da<.05){v=mix(v,.5,uAuto);u=mix(u,.4,uAuto);}
  if(r<.07){v=mix(v,.5,uCore);u=mix(u,.4,uCore);}
  float cl=uClear*smoothstep(.42,.0,r); u=mix(u,1.,cl); v=mix(v,0.,cl);
  float edge=smoothstep(.86,.95,r); v*=1.-.15*edge; if(r>.95){u=1.;v=0.;}
  gl_FragColor=vec4(clamp(u,0.,1.),clamp(v,0.,1.),0.,1.);
}`;
const RD_SHOW=`
precision highp float;
uniform sampler2D uS; uniform vec2 uRes; uniform float uR,uDark,uE,uAmp,uSpk;
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uR; float r=length(p);
  float aa=1.4/uR;
  float sh=.10*(1.-uDark)*exp(-pow(max(r-.98,0.)/.05,2.))*smoothstep(.95,1.,r);
  if(r>1.){gl_FragColor=vec4(0.,0.,.05,1.)*sh;return;}
  vec2 uv=p*.5+.5;
  float v=texture2D(uS,uv).y;
  float vx=texture2D(uS,uv+vec2(uE,0.)).y-texture2D(uS,uv-vec2(uE,0.)).y;
  float vy=texture2D(uS,uv+vec2(0.,uE)).y-texture2D(uS,uv-vec2(0.,uE)).y;
  float m=smoothstep(.1,.32,v)*smoothstep(.95,.84,r);
  vec3 dish=mix(vec3(.935,.935,.955),vec3(.075,.078,.10),uDark);
  vec3 ink=mix(vec3(.357,.357,.839),vec3(.64,.58,1.),uDark);
  float lit=clamp(.5+(vy-vx)*3.,0.,1.);
  vec3 col=mix(dish,ink*(.88+.24*lit),m*.9);
  col+=vec3(1.)*.12*max(lit-.5,0.)*m;
  col+=ink*uSpk*uAmp*.35*exp(-r*r*9.)*(1.-m);
  // glass: rim line, inner shade and a soft highlight
  col=mix(col,dish,smoothstep(.9,.97,r)*.55);
  float ring=exp(-pow((r-.982)*uR/1.3,2.));
  col=mix(col,mix(vec3(.72,.72,.8),vec3(.38,.37,.5),uDark),ring*.8);
  float hl=smoothstep(.86,.95,r)*smoothstep(1.,.96,r)*pow(max(dot(normalize(p+1e-5),normalize(vec2(-.6,.8))),0.),6.);
  col+=vec3(1.)*hl*mix(.5,.25,uDark);
  float a=1.-smoothstep(1.-aa,1.,r);
  gl_FragColor=vec4(col*a,a)+vec4(0.,0.,.05,1.)*sh*(1.-a);
}`;
function Culture(canvas,mini){
  const opts={alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:false};
  let gl=canvas.getContext('webgl2',opts), gl2=!!gl;
  if(!gl)gl=canvas.getContext('webgl',opts)||canvas.getContext('experimental-webgl',opts);
  if(!gl)throw new Error('WebGL unavailable');
  const SIM=mini?112:220;
  // float render targets
  let ifmt,type,lin=true;
  if(gl2){if(!gl.getExtension('EXT_color_buffer_float')&&!gl.getExtension('EXT_color_buffer_half_float'))throw new Error('No float render targets');ifmt=gl.RGBA16F;type=gl.HALF_FLOAT}
  else{const hf=gl.getExtension('OES_texture_half_float');gl.getExtension('EXT_color_buffer_half_float');
    if(hf){type=hf.HALF_FLOAT_OES;lin=!!gl.getExtension('OES_texture_half_float_linear')}
    else if(gl.getExtension('OES_texture_float')){type=gl.FLOAT;gl.getExtension('WEBGL_color_buffer_float');lin=!!gl.getExtension('OES_texture_float_linear')}
    else throw new Error('No float textures');ifmt=gl.RGBA}
  const tex=[],fbo=[];
  for(let i=0;i<2;i++){
    const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);
    gl.texImage2D(gl.TEXTURE_2D,0,ifmt,SIM,SIM,0,gl.RGBA,type,null);
    const f=lin?gl.LINEAR:gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,f);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,f);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tx,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Float framebuffer incomplete');
    tex.push(tx);fbo.push(fb);
  }
  const ps=program(gl,QUAD_VS,RD_SIM), pd=program(gl,QUAD_VS,RD_SHOW);
  const us=locs(gl,ps,['uGrid','uS','uPx','uF','uK','uT','uInit','uSeed','uCore','uClear','uAuto','uRot','uPtr','uAutoP']);
  const ud=locs(gl,pd,['uS','uRes','uR','uDark','uE','uAmp','uSpk']);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  [ps,pd].forEach(p=>{const a=gl.getAttribLocation(p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0)});
  let cur=0,acc=0,autoT=0,ax=0,ay=0,simT=0;
  const sim={F:.0367,K:.0649,seed:0,core:0,clear:0,auto:0,rot:0,px:9,py:9};
  function step(init){
    const dst=1-cur;
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo[dst]);gl.viewport(0,0,SIM,SIM);gl.useProgram(ps);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[cur]);
    gl.uniform1i(us.uS,0);gl.uniform2f(us.uPx,1/SIM,1/SIM);gl.uniform1f(us.uInit,init?1:0);gl.uniform1f(us.uGrid,SIM/16);
    gl.uniform1f(us.uF,sim.F);gl.uniform1f(us.uK,sim.K);gl.uniform1f(us.uT,simT);
    gl.uniform1f(us.uSeed,sim.seed);gl.uniform1f(us.uCore,sim.core);gl.uniform1f(us.uClear,sim.clear);
    gl.uniform1f(us.uAuto,sim.auto);gl.uniform2f(us.uAutoP,ax,ay);gl.uniform1f(us.uRot,sim.rot);gl.uniform2f(us.uPtr,sim.px,sim.py);
    gl.drawArrays(gl.TRIANGLES,0,6);cur=dst;
  }
  step(true);for(let i=0;i<(mini?900:1400);i++)step(false);
  return {R:1,resize(w,h){canvas.width=Math.round(w*DPR);canvas.height=Math.round(h*DPR);this.R=Math.min(w,h)*(mini?.44:.43)},
  draw(P){
    const W=P.W,amp=P.amp;
    sim.F=W[0]*.0367+W[1]*.0367+W[2]*.0545+W[3]*.0367;
    sim.K=W[0]*.0649+W[1]*.0649+W[2]*.0620+W[3]*.0649;
    const hv=P.hover>.3;
    sim.px=hv?P.px:9;sim.py=hv?-P.py:9;sim.seed=hv?(.04+.2*W[1]):0;
    sim.core=W[3]*amp*.25;
    sim.clear=W[1]*amp*.05;
    const rotF=P.dt*(.04+.08*W[2]);
    autoT-=P.dt;sim.auto=0;
    if(autoT<=0){autoT=2+Math.random()*3;const a=Math.random()*TAU,d=Math.sqrt(Math.random())*.75;ax=Math.cos(a)*d;ay=Math.sin(a)*d;sim.auto=.6}
    const rate=W[0]*3+W[1]*4+W[2]*14+W[3]*7;
    acc+=P.dt*60*rate;let n=Math.min(28,Math.floor(acc));acc-=n;
    for(let i=0;i<n;i++){simT+=1/60;sim.rot=i?0:rotF;step(false);sim.auto=0}sim.rot=0;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pd);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[cur]);
    gl.uniform1i(ud.uS,0);gl.uniform2f(ud.uRes,canvas.width,canvas.height);gl.uniform1f(ud.uR,this.R*DPR);
    gl.uniform1f(ud.uDark,P.dark);gl.uniform1f(ud.uE,1/SIM);gl.uniform1f(ud.uAmp,amp);gl.uniform1f(ud.uSpk,W[3]);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }};
}

/* =========================================================
   D · Glyphs (Canvas 2D): an AI made of type
   ========================================================= */

/* ---------- the engine ---------- */
const MAKERS = { swarm: Swarm, chrome: Chrome, cymatics: Cymatics, culture: Culture }
const STATES = ['idle', 'listening', 'thinking', 'speaking']
// Where the AI appears. Each host gets a canvas that shows the shared render.
const HOSTS = '.room .creature, .pa .creature, .rc-ai .creature, .fsheet-orb, .fempty .forb'
const SIZE = 200 // css px of the shared render
let style = 'orb', inst = null, src = null, getState = () => 'idle'
let ampIn = 0, phrase = 0, pitch = 0.5
const P = { t: 0, dt: 0, W: new Float32Array([1, 0, 0, 0]), amp: 0, px: 0, py: 0, hover: 0, dark: 0, phrase: 0, pitch: 0.5 }
const ptr = { x: 0, y: 0, tx: 0, ty: 0, h: 0, th: 0 }

export function initPresence(opts) { getState = opts.state ?? getState }
export function setPresenceAmp(a) { ampIn = a }
export function nextPhrase() { phrase++; pitch = Math.random() }
export function setPresenceStyle(s) {
  style = s
  document.body.dataset.presence = s
  inst = null
  src = null
  document.querySelectorAll('canvas.pcv').forEach((c) => c.remove())
  if (!MAKERS[s]) return
  try {
    src = document.createElement('canvas')
    inst = MAKERS[s](src, true)
    inst.resize(SIZE, SIZE)
  } catch (e) {
    console.warn('Presence style could not start; using the orb.', e)
    inst = null
    document.body.dataset.presence = 'orb'
  }
}
addEventListener('pointermove', (e) => {
  const host = [...document.querySelectorAll('.room .creature:not(.small), .fsheet-orb, .fempty .forb')].find((h) => h.offsetParent)
  if (!host) { ptr.th = 0; return }
  const r = host.getBoundingClientRect()
  const R = Math.max(30, r.width / 2) * 2.2
  ptr.tx = (e.clientX - r.left - r.width / 2) / R
  ptr.ty = (e.clientY - r.top - r.height / 2) / R
  ptr.th = Math.hypot(ptr.tx, ptr.ty) < 2.5 ? 1 : 0
})

let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  if (!inst) return
  const hosts = [...document.querySelectorAll(HOSTS)].filter((h) => h.offsetParent)
  if (!hosts.length) return
  const rdt = Math.min(0.05, Math.max(0, (now - last) / 1000))
  last = now
  const dt = rdt * (S.reduced ? 0.18 : 1)
  P.t += dt
  P.dt = dt
  const target = Math.max(0, STATES.indexOf(getState()))
  const kw = 1 - Math.exp(-rdt * 3.2)
  for (let i = 0; i < 4; i++) P.W[i] += ((i === target ? 1 : 0) - P.W[i]) * kw
  const breath = P.W[0] * (0.07 + 0.05 * Math.sin(P.t * 1.3)) + P.W[1] * (0.12 + 0.06 * Math.sin(P.t * 3.1)) + P.W[2] * (0.08 + 0.04 * Math.sin(P.t * 2.1))
  const tgt = Math.max(breath, ampIn * (S.reduced ? 0.45 : 1))
  P.amp += (tgt - P.amp) * (1 - Math.exp(-rdt * (tgt > P.amp ? 18 : 7)))
  const dk = document.documentElement.dataset.theme === 'dark' ? 1 : 0
  P.dark += (dk - P.dark) * (1 - Math.exp(-rdt * 5))
  const kp = 1 - Math.exp(-rdt * 6)
  ptr.x += (ptr.tx - ptr.x) * kp
  ptr.y += (ptr.ty - ptr.y) * kp
  ptr.h += (ptr.th - ptr.h) * (1 - Math.exp(-rdt * 4))
  P.px = Math.max(-1.6, Math.min(1.6, ptr.x))
  P.py = Math.max(-1.6, Math.min(1.6, ptr.y))
  P.hover = ptr.h
  P.phrase = phrase
  P.pitch = pitch
  inst.draw(P)
  for (const h of hosts) {
    let c = h.querySelector(':scope > canvas.pcv')
    if (!c) { c = document.createElement('canvas'); c.className = 'pcv'; c.setAttribute('aria-hidden', 'true'); h.appendChild(c) }
    const w = Math.max(2, Math.round(c.clientWidth * DPR)), hh = Math.max(2, Math.round(c.clientHeight * DPR))
    if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh }
    const g = c.getContext('2d')
    g.clearRect(0, 0, w, hh)
    g.drawImage(src, 0, 0, w, hh)
  }
}
requestAnimationFrame(frame)
