import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

/**
 * Create an elegant glass-like card material.
 * @param {number} color - Base color.
 * @param {number} opacity - Material opacity.
 * @returns {THREE.MeshPhysicalMaterial} Material instance.
 */
function createGlassMaterial(color, opacity = 0.3) {
  return new THREE.MeshPhysicalMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.18,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.18
  });
}

/**
 * Draw a rounded rectangle on a canvas context.
 * @param {CanvasRenderingContext2D} context - Canvas rendering context.
 * @param {number} x - X origin.
 * @param {number} y - Y origin.
 * @param {number} width - Rectangle width.
 * @param {number} height - Rectangle height.
 * @param {number} radius - Border radius.
 */
function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

/**
 * Create a 3D balloon-like label using a canvas texture and a sprite.
 * @param {string} text - Label text.
 * @param {object} [options] - Label visual options.
 * @param {string} [options.background] - Background fill color.
 * @param {string} [options.border] - Border color.
 * @returns {THREE.Sprite} Sprite label for use in the 3D scene.
 */
function createBalloonLabel(text, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;

  const context = canvas.getContext('2d');
  if (!context) {
    return new THREE.Sprite();
  }

  const background = options.background || 'rgba(67, 109, 201, 0.68)';
  const border = options.border || 'rgba(201, 230, 255, 0.95)';

  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, background);
  gradient.addColorStop(1, 'rgba(34, 84, 167, 0.62)');

  drawRoundedRect(context, 10, 10, canvas.width - 20, canvas.height - 20, 120);
  context.fillStyle = gradient;
  context.fill();

  context.lineWidth = 8;
  context.strokeStyle = border;
  context.stroke();

  context.beginPath();
  context.arc(90, 128, 24, 0, Math.PI * 2);
  context.fillStyle = 'rgba(220, 246, 255, 0.95)';
  context.fill();

  context.font = '700 86px Inter, Segoe UI, Arial, sans-serif';
  context.fillStyle = 'rgba(245, 252, 255, 0.98)';
  context.textBaseline = 'middle';
  context.fillText(text.toUpperCase(), 140, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.95
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.85, 0.46, 1);
  return sprite;
}

/**
 * Build a thin callout connector line.
 * @param {THREE.Vector3} start - Line start point.
 * @param {THREE.Vector3} end - Line end point.
 * @returns {THREE.Line} Connector line.
 */
function createCalloutLine(start, end) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({
    color: 0xc3e4ff,
    transparent: true,
    opacity: 0.68
  });
  return new THREE.Line(geometry, material);
}

/**
 * Build and initialize hero 3D visualization for the landing page.
 * The scene depicts a project management flow with a central hub,
 * kanban-style task columns, milestones, and animated data links.
 */
function initHero3D() {
  const container = document.getElementById('hero3dScene');
  if (!container) {
    return;
  }

  /** @type {THREE.WebGLRenderer | undefined} */
  let renderer;

  try {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b2952, 10, 22);

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.35, 8.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Lighting setup
    scene.add(new THREE.HemisphereLight(0xb9f3ff, 0x0b1e40, 0.88));

    const keyLight = new THREE.DirectionalLight(0xd4f6ff, 1.05);
    keyLight.position.set(4.5, 6, 6);
    scene.add(keyLight);

    const accentLight = new THREE.PointLight(0x66d8ff, 1.4, 30);
    accentLight.position.set(-4, 3.5, 4.5);
    scene.add(accentLight);

    const backLight = new THREE.PointLight(0x6f6bff, 1.1, 24);
    backLight.position.set(0, 1.2, -6);
    scene.add(backLight);

    // Main composition group
    const root = new THREE.Group();
    root.position.y = 0.4;
    scene.add(root);

    // Floor grid
    const floor = new THREE.GridHelper(18, 26, 0x58adff, 0x1d4f80);
    floor.position.y = -2.1;
    floor.material.opacity = 0.22;
    floor.material.transparent = true;
    scene.add(floor);

    // Central program hub
    const hub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.82, 1),
      new THREE.MeshStandardMaterial({
        color: 0x8de7ff,
        emissive: 0x2b8fff,
        emissiveIntensity: 0.5,
        roughness: 0.22,
        metalness: 0.35
      })
    );
    hub.position.set(0, 0.78, 0.2);
    root.add(hub);

    const hubHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.06, 16, 120),
      new THREE.MeshStandardMaterial({
        color: 0xd8eaff,
        emissive: 0x5a8dff,
        emissiveIntensity: 0.75,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2,
        metalness: 0.2
      })
    );
    hubHalo.position.copy(hub.position);
    hubHalo.rotation.x = Math.PI * 0.43;
    root.add(hubHalo);

    // Wireframe ring for sophistication
    const hubWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.06, 0)),
      new THREE.LineBasicMaterial({
        color: 0xa8d4ff,
      transparent: true,
        opacity: 0.6
      })
    );
    hubWire.position.copy(hub.position);
    root.add(hubWire);

    // Kanban-style columns
    const columnsGroup = new THREE.Group();
    columnsGroup.position.set(0, -0.1, -0.5);
    root.add(columnsGroup);

    const columnX = [-2.3, 0, 2.3];
    const columnTint = [0x6cb4ff, 0x79e2d5, 0xb7a4ff];
    const cards = [];

    columnX.forEach((x, colIndex) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.9, 0.08), createGlassMaterial(columnTint[colIndex], 0.26));
      panel.position.set(x, 0.08, -0.28);
      columnsGroup.add(panel);

      const panelEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 2.9, 0.08)),
        new THREE.LineBasicMaterial({ color: 0x9ccfff, transparent: true, opacity: 0.48 })
      );
      panelEdge.position.copy(panel.position);
      columnsGroup.add(panelEdge);

      const header = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.22, 0.1),
        new THREE.MeshStandardMaterial({
          color: columnTint[colIndex],
          emissive: columnTint[colIndex],
          emissiveIntensity: 0.27,
          roughness: 0.35,
          metalness: 0.2
        })
      );
      header.position.set(x, 1.3, -0.21);
      columnsGroup.add(header);

      for (let i = 0; i < 4; i += 1) {
        const card = new THREE.Mesh(
          new THREE.BoxGeometry(1.06, 0.24, 0.065),
          new THREE.MeshStandardMaterial({
            color: 0xe9f6ff,
            emissive: 0x2f6cae,
            emissiveIntensity: 0.06,
            roughness: 0.28,
            metalness: 0.25
          })
        );
        card.position.set(x, 0.95 - i * 0.55, -0.14 + i * 0.01);
        columnsGroup.add(card);
        cards.push({ card, seed: colIndex * 10 + i });
      }
    });

    // Milestone pathway + milestones
    const milestoneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.2, -1.2, 0.5),
      new THREE.Vector3(-1.2, -0.9, 1.15),
      new THREE.Vector3(1.2, -1.0, 1.1),
      new THREE.Vector3(3.2, -0.72, 0.4)
    ]);

    const milestonePath = new THREE.Mesh(
      new THREE.TubeGeometry(milestoneCurve, 80, 0.045, 10, false),
      new THREE.MeshStandardMaterial({
        color: 0xb8d3ff,
        emissive: 0x5f92ff,
        emissiveIntensity: 0.28,
        transparent: true,
        opacity: 0.82,
        roughness: 0.25,
        metalness: 0.25
      })
    );
    root.add(milestonePath);

    const milestones = [];
    [0.08, 0.27, 0.48, 0.68, 0.9].forEach((t, index) => {
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshStandardMaterial({
          color: index < 3 ? 0x86ffc0 : 0x87b8ff,
          emissive: index < 3 ? 0x43e890 : 0x6596ff,
          emissiveIntensity: 0.4,
          roughness: 0.24,
          metalness: 0.32
        })
      );
      marker.position.copy(milestoneCurve.getPointAt(t));
      root.add(marker);
      milestones.push({ marker, phase: index * 0.65 });
    });

    // In-scene 3D labels (replacing HTML badges)
    const floatingLabels = [];

    const programHubLabel = createBalloonLabel('Program Hub', {
      background: 'rgba(64, 123, 216, 0.72)',
      border: 'rgba(196, 230, 255, 0.96)'
    });
    programHubLabel.position.set(-1.55, 2.05, 1.25);
    root.add(programHubLabel);
    root.add(createCalloutLine(new THREE.Vector3(-0.35, 1.3, 0.72), programHubLabel.position.clone()));
    floatingLabels.push({ sprite: programHubLabel, baseY: 2.05, phase: 0.2 });

    const smartFlowLabel = createBalloonLabel('Smart Task Flow', {
      background: 'rgba(67, 150, 165, 0.74)',
      border: 'rgba(194, 246, 237, 0.95)'
    });
    smartFlowLabel.position.set(0, 2.55, -0.65);
    root.add(smartFlowLabel);
    root.add(createCalloutLine(new THREE.Vector3(0, 1.45, -0.35), smartFlowLabel.position.clone()));
    floatingLabels.push({ sprite: smartFlowLabel, baseY: 2.55, phase: 1.1 });

    const milestoneLabel = createBalloonLabel('Milestones', {
      background: 'rgba(52, 164, 130, 0.74)',
      border: 'rgba(205, 253, 221, 0.95)'
    });
    milestoneLabel.position.set(-2.6, -0.05, 1.62);
    root.add(milestoneLabel);
    root.add(createCalloutLine(new THREE.Vector3(-2.2, -0.95, 0.85), milestoneLabel.position.clone()));
    floatingLabels.push({ sprite: milestoneLabel, baseY: -0.05, phase: 2.3 });

    const progressLabel = createBalloonLabel('Delivery Progress', {
      background: 'rgba(91, 104, 211, 0.72)',
      border: 'rgba(208, 219, 255, 0.95)'
    });
    progressLabel.position.set(3.08, 0.42, 1.12);
    root.add(progressLabel);
    root.add(createCalloutLine(new THREE.Vector3(2.72, -0.8, 0.58), progressLabel.position.clone()));
    floatingLabels.push({ sprite: progressLabel, baseY: 0.42, phase: 3.1 });

    // Data links from hub to columns with moving pulses
    const linkCurves = columnX.map((x) => new THREE.CatmullRomCurve3([
      hub.position.clone(),
      new THREE.Vector3(x * 0.45, 1.3, 0.9),
      new THREE.Vector3(x, 1.36, -0.2)
    ]));

    const linkPulses = [];

    linkCurves.forEach((curve, index) => {
      const linkTube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 70, 0.022, 8, false),
        new THREE.MeshStandardMaterial({
          color: 0xa4ceff,
          emissive: 0x5f88ff,
          emissiveIntensity: 0.22,
          transparent: true,
          opacity: 0.72
        })
      );
      root.add(linkTube);

      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 14, 14),
        new THREE.MeshStandardMaterial({
          color: 0xd6f7ff,
          emissive: 0x8cd0ff,
          emissiveIntensity: 0.7,
          roughness: 0.2,
          metalness: 0.2
        })
      );
      root.add(pulse);
      linkPulses.push({ pulse, curve, offset: index * 0.27 });
    });

    // Ambient particles
    const particleCount = 320;
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i += 1) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 17;
      particlePositions[i3 + 1] = (Math.random() - 0.45) * 8.5;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 17;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xcde9ff,
        size: 0.028,
        transparent: true,
        opacity: 0.72,
        sizeAttenuation: true
      })
    );
    scene.add(particles);

    // Pointer interaction
    let targetRotationX = 0;
    let targetRotationY = 0;
    let targetCameraY = 1.35;

    container.addEventListener('pointermove', (event) => {
      const bounds = container.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;

      targetRotationY = (x - 0.5) * 0.34;
      targetRotationX = (y - 0.5) * 0.16;
      targetCameraY = 1.35 + (0.5 - y) * 0.36;
    });

    container.addEventListener('pointerleave', () => {
      targetRotationX = 0;
      targetRotationY = 0;
      targetCameraY = 1.35;
    });

    // Resize
    const handleResize = () => {
      if (!container.clientWidth || !container.clientHeight) {
        return;
      }
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Animation loop
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      hub.rotation.x += 0.003;
      hub.rotation.y += 0.0045;
      hubHalo.rotation.z += 0.007;
      hubWire.rotation.y -= 0.004;

      cards.forEach((entry, index) => {
        const floating = Math.sin(elapsed * 1.1 + entry.seed * 0.34) * 0.032;
        entry.card.position.z = -0.14 + (index % 4) * 0.008 + floating;
      });

      milestones.forEach((entry, index) => {
        entry.marker.rotation.x += 0.01;
        entry.marker.rotation.y += 0.013;
        entry.marker.position.y += Math.sin(elapsed * 1.5 + entry.phase) * 0.0018;
        entry.marker.scale.setScalar(1 + Math.sin(elapsed * 1.4 + index) * 0.06);
      });

      linkPulses.forEach((entry) => {
        const t = (elapsed * 0.18 + entry.offset) % 1;
        entry.pulse.position.copy(entry.curve.getPointAt(t));
      });

      floatingLabels.forEach((entry, index) => {
        entry.sprite.position.y = entry.baseY + Math.sin(elapsed * 0.8 + entry.phase) * 0.035;
        entry.sprite.material.opacity = 0.86 + Math.sin(elapsed * 1.1 + index) * 0.08;
      });

      root.rotation.x += (targetRotationX - root.rotation.x) * 0.03;
      root.rotation.y += (targetRotationY - root.rotation.y) * 0.028;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;

      particles.rotation.y -= 0.0005;
      particles.rotation.x = Math.sin(elapsed * 0.11) * 0.02;

      floor.rotation.y = Math.sin(elapsed * 0.06) * 0.05;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();
  } catch (error) {
    console.error('3D hero visualization failed to initialize:', error);
    container.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-white p-3">3D preview unavailable on this device.</div>';
    if (renderer) {
      renderer.dispose();
    }
  }
}

initHero3D();
