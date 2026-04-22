import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useHashStore } from '../store/hashStore';

// ─── Constants ───────────────────────────────────────────────────────────────
const RING_RADIUS  = 9;
const BUCKET_HEIGHT = 2.2;
const BUCKET_RADIUS = 0.85;
const SPHERE_RADIUS = 0.36;
const CHAIN_STEP    = 0.82;

const ZOOM_MIN = 6;    // closest allowed camera distance
const ZOOM_MAX = 55;   // farthest allowed camera distance
const ZOOM_SPEED_WHEEL  = 0.12;  // fraction per wheel tick
const ZOOM_SPEED_PINCH  = 0.008; // fraction per pixel of pinch delta

const COLOR_EMPTY   = new THREE.Color(0x0d2233);
const COLOR_LOW     = new THREE.Color(0x00c8d4);
const COLOR_MID     = new THREE.Color(0xffaa00);
const COLOR_HIGH    = new THREE.Color(0xff3366);
const COLOR_DELETED = new THREE.Color(0x3a3a4a);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function bucketPosition(index: number, total: number): THREE.Vector3 {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(
    Math.cos(angle) * RING_RADIUS,
    0,
    Math.sin(angle) * RING_RADIUS
  );
}

function loadColor(load: number): THREE.Color {
  if (load < 0.5) return COLOR_LOW.clone().lerp(COLOR_MID, load * 2);
  return COLOR_MID.clone().lerp(COLOR_HIGH, (load - 0.5) * 2);
}

function sphereColor(key: number): THREE.Color {
  const hue = (key * 137.508) % 360;
  return new THREE.Color(`hsl(${hue}, 90%, 65%)`);
}

function clampZoom(dist: number) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, dist));
}

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Component ───────────────────────────────────────────────────────────────
export default function ThreeScene() {
  const canvasRef   = useRef<HTMLDivElement>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const rendRef     = useRef<THREE.WebGLRenderer | null>(null);
  const camRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef    = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Camera orbit state (shared with RAF via refs)
  const orbitRef = useRef({
    isDragging:  false,
    prevX:       0,
    prevY:       0,
    theta:       0,        // horizontal angle (radians)
    phi:         0.6,      // vertical angle (radians)
    radius:      24,       // distance from origin
    autoRotate:  true,
    // Pinch state
    isPinching:  false,
    prevPinchDist: 0,
  });

  const bucketsRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const spheresRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const table      = useHashStore((s) => s.table);
  const consumeEvt = useHashStore((s) => s.consumeEvents);

  // ── Scene init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = canvasRef.current!;
    const W = container.clientWidth, H = container.clientHeight;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    rendRef.current = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14);
    scene.fog = new THREE.FogExp2(0x080c14, 0.025);
    sceneRef.current = scene;

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300);
    camRef.current = camera;

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x4466aa, 3.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.0);
    sun.position.set(5, 15, 5);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.PointLight(0x00f5ff, 3, 80);
    fill.position.set(0, 8, 0);
    scene.add(fill);
    const rim = new THREE.PointLight(0xff00ff, 1.5, 60);
    rim.position.set(-10, 4, -10);
    scene.add(rim);
    scene.add(new THREE.PointLight(0x002244, 2, 30));

    // ── Ground grid ──
    const grid = new THREE.GridHelper(40, 40, 0x0d2233, 0x0d2233);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // ── Camera position updater (spherical coords) ──
    const orbit = orbitRef.current;
    const updateCamera = () => {
      const r = orbit.radius;
      const p = orbit.phi;
      const t = orbit.theta;
      camera.position.set(
        r * Math.sin(p) * Math.sin(t),
        r * Math.cos(p),
        r * Math.sin(p) * Math.cos(t)
      );
      camera.lookAt(0, 0, 0);
    };
    updateCamera();

    // ── POINTER DRAG (orbit) ──
    const onPointerDown = (e: PointerEvent) => {
      orbit.isDragging  = true;
      orbit.autoRotate  = false;
      orbit.prevX       = e.clientX;
      orbit.prevY       = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerUp = () => {
      orbit.isDragging = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!orbit.isDragging || orbit.isPinching) return;
      const dx = e.clientX - orbit.prevX;
      const dy = e.clientY - orbit.prevY;
      orbit.prevX = e.clientX;
      orbit.prevY = e.clientY;
      orbit.theta -= dx * 0.008;
      orbit.phi    = Math.max(0.15, Math.min(Math.PI * 0.9, orbit.phi + dy * 0.006));
      updateCamera();
    };

    // ── MOUSE WHEEL ZOOM ──
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbit.autoRotate = false;
      // Normalize delta across browsers
      const delta = e.deltaY > 0 ? 1 : -1;
      orbit.radius = clampZoom(orbit.radius * (1 + delta * ZOOM_SPEED_WHEEL));
      updateCamera();
    };

    // ── TOUCH PINCH ZOOM (two-finger gesture) ──
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        orbit.isPinching = true;
        orbit.isDragging = false;
        orbit.prevPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1) {
        orbit.isDragging  = true;
        orbit.autoRotate  = false;
        orbit.prevX = e.touches[0].clientX;
        orbit.prevY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && orbit.isPinching) {
        // Pinch-to-zoom
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = orbit.prevPinchDist - dist; // positive = zooming out
        orbit.radius = clampZoom(orbit.radius + delta * ZOOM_SPEED_PINCH * orbit.radius);
        orbit.prevPinchDist = dist;
        updateCamera();
      } else if (e.touches.length === 1 && orbit.isDragging) {
        const dx = e.touches[0].clientX - orbit.prevX;
        const dy = e.touches[0].clientY - orbit.prevY;
        orbit.prevX = e.touches[0].clientX;
        orbit.prevY = e.touches[0].clientY;
        orbit.theta -= dx * 0.008;
        orbit.phi    = Math.max(0.15, Math.min(Math.PI * 0.9, orbit.phi + dy * 0.006));
        updateCamera();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) orbit.isPinching = false;
      if (e.touches.length === 0) orbit.isDragging = false;
    };

    // Register all listeners
    renderer.domElement.addEventListener('pointerdown',  onPointerDown);
    renderer.domElement.addEventListener('pointerup',    onPointerUp);
    renderer.domElement.addEventListener('pointermove',  onPointerMove);
    renderer.domElement.addEventListener('wheel',        onWheel,       { passive: false });
    renderer.domElement.addEventListener('touchstart',   onTouchStart,  { passive: false });
    renderer.domElement.addEventListener('touchmove',    onTouchMove,   { passive: false });
    renderer.domElement.addEventListener('touchend',     onTouchEnd);

    // ── Resize ──
    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    // ── RAF loop (60fps cap) ──
    const animate = (time: number) => {
      frameRef.current = requestAnimationFrame(animate);
      const delta = time - lastTimeRef.current;
      if (delta < 16) return;
      lastTimeRef.current = time;

      // Auto-rotate when idle
      if (orbit.autoRotate && !orbit.isDragging) {
        orbit.theta += 0.002;
        updateCamera();
      }

      renderer.render(scene, camera);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.domElement.removeEventListener('pointerdown',  onPointerDown);
      renderer.domElement.removeEventListener('pointerup',    onPointerUp);
      renderer.domElement.removeEventListener('pointermove',  onPointerMove);
      renderer.domElement.removeEventListener('wheel',        onWheel);
      renderer.domElement.removeEventListener('touchstart',   onTouchStart);
      renderer.domElement.removeEventListener('touchmove',    onTouchMove);
      renderer.domElement.removeEventListener('touchend',     onTouchEnd);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // ── Build/rebuild bucket ring when m changes ──────────────────────────────
  const buildBuckets = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const m = table.m;

    bucketsRef.current.forEach((mesh) => scene.remove(mesh));
    bucketsRef.current.clear();

    const geo    = new THREE.CylinderGeometry(BUCKET_RADIUS, BUCKET_RADIUS, BUCKET_HEIGHT, 32, 1, true);
    const capGeo = new THREE.CircleGeometry(BUCKET_RADIUS, 32);

    for (let i = 0; i < m; i++) {
      const pos = bucketPosition(i, m);
      const mat = new THREE.MeshPhongMaterial({
        color:      0x1a4060,
        transparent: true,
        opacity:    0.82,
        side:       THREE.DoubleSide,
        emissive:   new THREE.Color(0x0a2040),
        specular:   new THREE.Color(0x00ffff),
        shininess:  90,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      mesh.userData   = { index: i, type: 'bucket' };

      const capMat = new THREE.MeshPhongMaterial({
        color:    0x0a2040,
        side:     THREE.DoubleSide,
        emissive: new THREE.Color(0x051020),
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.rotation.x = -Math.PI / 2;
      cap.position.y = -BUCKET_HEIGHT / 2;
      mesh.add(cap);

      // Neon edge ring at top of bucket
      const ringGeo = new THREE.TorusGeometry(BUCKET_RADIUS, 0.04, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = BUCKET_HEIGHT / 2;
      mesh.add(ring);

      addTextSprite(
        scene,
        `${i}`,
        pos.clone().add(new THREE.Vector3(0, BUCKET_HEIGHT / 2 + 0.7, 0)),
        0.7
      );

      scene.add(mesh);
      bucketsRef.current.set(i, mesh);
    }
  }, [table.m]);

  useEffect(() => { buildBuckets(); }, [buildBuckets]);

  // ── Sync bucket colors ────────────────────────────────────────────────────
  useEffect(() => {
    const { slots } = table;
    slots.forEach((slot, i) => {
      const mesh = bucketsRef.current.get(i);
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshPhongMaterial;
      if (slot.state === 'deleted') {
        mat.color.set(COLOR_DELETED); mat.emissive.set(0x111111);
      } else if (slot.state === 'empty') {
        mat.color.set(COLOR_EMPTY); mat.emissive.set(0x001122);
      } else {
        const chainLen = slot.chain?.length ?? 1;
        const load = Math.min(chainLen / 4, 1);
        const c = loadColor(load);
        mat.color.set(c); mat.emissive.copy(c).multiplyScalar(0.18);
      }
    });
  }, [table]);

  // ── Process animation events ──────────────────────────────────────────────
  // CHAINING    → 'chain' events: sphere arcs to SAME bucket, stacks vertically
  // OPEN ADDR.  → probe→probe→insert: sphere BOUNCES between DIFFERENT buckets
  useEffect(() => {
    const events = consumeEvt();
    if (!events.length || !sceneRef.current) return;
    const scene = sceneRef.current;
    const { m, strategy } = table;
    const dur = prefersReducedMotion ? 0 : 0.7;

    // ── CHAINING (Open Hashing) ──────────────────────────────────────────────
    if (strategy === 'chaining') {
      events.forEach((evt) => {
        if (evt.type !== 'chain') return;
        const chainIdx  = evt.chainIndex ?? 0;
        const bPos      = bucketPosition(evt.slotIndex, m);
        const targetY   = BUCKET_HEIGHT / 2 - 0.3 - chainIdx * CHAIN_STEP;
        const target    = new THREE.Vector3(bPos.x, targetY, bPos.z);
        const color     = sphereColor(evt.key);
        const sphere    = new THREE.Mesh(
          new THREE.SphereGeometry(SPHERE_RADIUS, 24, 24),
          new THREE.MeshPhongMaterial({ color, emissive: color.clone().multiplyScalar(0.55), shininess: 130 })
        );
        sphere.position.set(0, 16, 0);
        scene.add(sphere);
        spheresRef.current.set(`${evt.key}-${chainIdx}`, sphere);

        if (prefersReducedMotion) {
          sphere.position.copy(target);
        } else {
          const mid   = new THREE.Vector3(target.x * 0.5, 15, target.z * 0.5);
          const curve = new THREE.QuadraticBezierCurve3(sphere.position.clone(), mid, target);
          const obj   = { t: 0 };
          gsap.to(obj, {
            t: 1, duration: dur, ease: 'power2.out',
            onUpdate() { sphere.position.copy(curve.getPoint(obj.t)); },
            onComplete() {
              sphere.position.copy(target);
              addGlowRing(scene, target, color, 0.4);
              if (chainIdx > 0) {
                const abovePos = new THREE.Vector3(bPos.x, BUCKET_HEIGHT / 2 - 0.3 - (chainIdx - 1) * CHAIN_STEP, bPos.z);
                addRod(scene, abovePos, target);
                flashBucket(bucketsRef.current.get(evt.slotIndex)!, '#ff3366');
              }
            },
          });
        }
      });
      return;
    }

    // ── OPEN ADDRESSING (Closed Hashing) ────────────────────────────────────
    // Group events by key; each key gets ONE sphere that hops between buckets
    const byKey = new Map<number, typeof events>();
    events.forEach((evt) => {
      if (!byKey.has(evt.key)) byKey.set(evt.key, []);
      byKey.get(evt.key)!.push(evt);
    });

    byKey.forEach((keyEvents, key) => {
      const color  = sphereColor(key);
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(SPHERE_RADIUS, 24, 24),
        new THREE.MeshPhongMaterial({ color, emissive: color.clone().multiplyScalar(0.5), shininess: 120 })
      );
      sphere.position.set(0, 16, 0);
      scene.add(sphere);
      spheresRef.current.set(`${key}-0`, sphere);

      const spawnEvt  = keyEvents.find((e) => e.type === 'probe' && e.probeStep === -1);
      const spawnBPos = bucketPosition(spawnEvt?.slotIndex ?? 0, m);
      const initPt    = new THREE.Vector3(spawnBPos.x, spawnBPos.y + BUCKET_HEIGHT / 2 + 0.3, spawnBPos.z);

      const tl = gsap.timeline();

      // Arc from input zone down to initial hash slot
      if (!prefersReducedMotion) {
        const mid0  = new THREE.Vector3(spawnBPos.x * 0.4, 16, spawnBPos.z * 0.4);
        const crv0  = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 16, 0), mid0, initPt);
        const obj0  = { t: 0 };
        tl.to(obj0, {
          t: 1, duration: dur * 0.65, ease: 'power2.out',
          onUpdate() { sphere.position.copy(crv0.getPoint(obj0.t)); },
          onComplete() { sphere.position.copy(initPt); },
        });
      } else { sphere.position.copy(initPt); }

      // Probe/insert hops
      const hops = keyEvents.filter((e) => e.probeStep !== undefined && e.probeStep >= 0);
      let prevPt  = initPt;
      hops.forEach((evt) => {
        const bPos      = bucketPosition(evt.slotIndex, m);
        const isLanding = evt.type === 'insert';
        const hopY      = isLanding ? bPos.y + 0.4 : bPos.y + BUCKET_HEIGHT / 2 + 0.6;
        const hopPt     = new THREE.Vector3(bPos.x, hopY, bPos.z);

        if (prefersReducedMotion) {
          sphere.position.copy(hopPt);
        } else {
          const hopMid = new THREE.Vector3(
            (prevPt.x + hopPt.x) / 2,
            Math.max(prevPt.y, hopPt.y) + 2.5,
            (prevPt.z + hopPt.z) / 2
          );
          const hopCrv = new THREE.QuadraticBezierCurve3(prevPt.clone(), hopMid, hopPt);
          const hopObj = { t: 0 };
          tl.to(hopObj, {
            t: 1,
            duration: isLanding ? dur * 0.45 : 0.38,
            ease: isLanding ? 'bounce.out' : 'power1.inOut',
            onUpdate() { sphere.position.copy(hopCrv.getPoint(hopObj.t)); },
            onComplete() {
              sphere.position.copy(hopPt);
              if (isLanding) addGlowRing(scene, hopPt, color, 0.5);
              else flashBucket(bucketsRef.current.get(evt.slotIndex)!, '#ff3366');
            },
          });
        }
        prevPt = hopPt;
      });
    });

    // Handle search results / tombstone
    events.forEach((evt) => {
      if (evt.type === 'found') {
        const sp = spheresRef.current.get(`${evt.key}-0`);
        if (sp && !prefersReducedMotion) {
          setTimeout(() => gsap.to((sp.material as THREE.MeshPhongMaterial).emissive, { r: 0, g: 1, b: 0.5, duration: 0.3, yoyo: true, repeat: 3 }), 500);
        }
      } else if (evt.type === 'not_found') {
        const bucket = bucketsRef.current.get(evt.slotIndex);
        if (bucket && !prefersReducedMotion)
          gsap.to(bucket.position, { x: `+=${0.25}`, duration: 0.06, yoyo: true, repeat: 5, ease: 'none', onComplete() { bucket.position.copy(bucketPosition(evt.slotIndex, m)); } });
      } else if (evt.type === 'delete') {
        const sp = spheresRef.current.get(`${evt.key}-0`);
        if (sp) {
          gsap.to(sp.scale, { x: 0, y: 0, z: 0, duration: 0.4, onComplete: () => {
            scene.remove(sp);
            spheresRef.current.delete(`${evt.key}-0`);
          }});
        }
      } else if (evt.type === 'tombstone') {
        const sp = spheresRef.current.get(`${evt.key}-0`);
        if (sp) {
          const mat = sp.material as THREE.MeshPhongMaterial;
          gsap.to(mat.color, { r: 0.2, g: 0.2, b: 0.3, duration: 0.5 });
          gsap.to(mat.emissive, { r: 0, g: 0, b: 0, duration: 0.5 });
          gsap.to(sp.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.5 });
        }
        const bk = bucketsRef.current.get(evt.slotIndex);
        if (bk) {
          const mat = bk.material as THREE.MeshPhongMaterial;
          gsap.to(mat.emissive, { r: 0.3, g: 0.1, b: 0.1, duration: 0.5 });
        }
      }
    });
  }, [table.n, table.collisionCount]); // eslint-disable-line

  return (
    <div className="canvas-wrapper w-full h-full relative" role="region" aria-label="3D hash table visualization">
      <div ref={canvasRef} className="w-full h-full" />

      {/* ── Zoom Controls HUD ─────────────────────────────────────────────── */}
      <div
        className="absolute bottom-4 right-4 flex flex-col gap-1"
        style={{ zIndex: 10 }}
      >
        <button
          aria-label="Zoom in"
          title="Zoom In  (Scroll ↑ / Pinch out)"
          onClick={() => {
            const o = orbitRef.current;
            o.radius = clampZoom(o.radius * (1 - ZOOM_SPEED_WHEEL * 3));
            if (camRef.current) {
              const r = o.radius;
              camRef.current.position.set(
                r * Math.sin(o.phi) * Math.sin(o.theta),
                r * Math.cos(o.phi),
                r * Math.sin(o.phi) * Math.cos(o.theta)
              );
              camRef.current.lookAt(0, 0, 0);
            }
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-150"
          style={{
            background: 'rgba(0,245,255,0.12)',
            border: '1px solid rgba(0,245,255,0.35)',
            color: '#00f5ff',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(0,245,255,0.15)',
          }}
        >+</button>
        <button
          aria-label="Zoom out"
          title="Zoom Out  (Scroll ↓ / Pinch in)"
          onClick={() => {
            const o = orbitRef.current;
            o.radius = clampZoom(o.radius * (1 + ZOOM_SPEED_WHEEL * 3));
            if (camRef.current) {
              const r = o.radius;
              camRef.current.position.set(
                r * Math.sin(o.phi) * Math.sin(o.theta),
                r * Math.cos(o.phi),
                r * Math.sin(o.phi) * Math.cos(o.theta)
              );
              camRef.current.lookAt(0, 0, 0);
            }
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-150"
          style={{
            background: 'rgba(0,245,255,0.12)',
            border: '1px solid rgba(0,245,255,0.35)',
            color: '#00f5ff',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(0,245,255,0.15)',
          }}
        >−</button>
        <button
          aria-label="Reset camera"
          title="Reset Camera"
          onClick={() => {
            const o = orbitRef.current;
            o.radius = 24; o.phi = 0.6; o.theta = 0; o.autoRotate = true;
            if (camRef.current) {
              camRef.current.position.set(0, 14, 24);
              camRef.current.lookAt(0, 0, 0);
            }
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs transition-all duration-150"
          style={{
            background: 'rgba(0,245,255,0.08)',
            border: '1px solid rgba(0,245,255,0.2)',
            color: '#00f5ff',
            cursor: 'pointer',
          }}
        >⌂</button>
      </div>

      {/* ── Gesture hint tooltip ──────────────────────────────────────────── */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 rounded-full pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(0,245,255,0.15)',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}
      >
        {[
          { icon: '🖱️', label: 'Drag to orbit' },
          { icon: '⚙️', label: 'Scroll to zoom' },
          { icon: '🤏', label: 'Pinch to zoom' },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-1 text-xs"
            style={{ color: 'rgba(180,210,240,0.6)', fontFamily: 'var(--font-mono)' }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Scene Helpers ────────────────────────────────────────────────────────────

function addRod(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.05, 0.05, len, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.6 });
  const rod = new THREE.Mesh(geo, mat);
  rod.position.copy(from.clone().add(to).multiplyScalar(0.5));
  rod.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  scene.add(rod);
}

function addGlowRing(scene: THREE.Scene, pos: THREE.Vector3, color: THREE.Color, dur: number) {
  const geo  = new THREE.TorusGeometry(SPHERE_RADIUS * 1.8, 0.06, 8, 32);
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(geo, mat);
  ring.position.copy(pos);
  scene.add(ring);
  gsap.to(mat,        { opacity: 0, duration: dur, onComplete: () => scene.remove(ring) });
  gsap.to(ring.scale, { x: 3, y: 3, z: 3, duration: dur });
}

function flashBucket(bucket: THREE.Mesh, color: string) {
  const mat = bucket.material as THREE.MeshPhongMaterial;
  const original = mat.emissive.clone();
  gsap.to(mat.emissive, {
    r: new THREE.Color(color).r,
    g: new THREE.Color(color).g,
    b: new THREE.Color(color).b,
    duration: 0.2,
    yoyo: true,
    repeat: 3,
    onComplete: () => mat.emissive.copy(original),
  });
}

function addTextSprite(scene: THREE.Scene, text: string, pos: THREE.Vector3, size: number) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 80;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle   = 'rgba(0,245,255,0.9)';
  ctx.font        = 'bold 36px monospace';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 40, 40);
  const tex    = new THREE.CanvasTexture(canvas);
  const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.position.copy(pos);
  sprite.scale.set(size, size, 1);
  scene.add(sprite);
}
