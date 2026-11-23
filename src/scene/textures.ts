import * as THREE from 'three';

function createMarbleTexture(baseHex: string, veinHex: string, seedOffset: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle organic mineral clouding
  for (let i = 0; i < 28; i++) {
    const x = ((Math.sin(i * 12.9898 + seedOffset) * 43758.5453) % 1 + 1) % 1 * size;
    const y = ((Math.sin(i * 78.233 + seedOffset) * 24634.6345) % 1 + 1) % 1 * size;
    const r = 28 + (i % 5) * 14;
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, veinHex + '14');
    grad.addColorStop(1, veinHex + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  // Delicate marble veins
  ctx.strokeStyle = veinHex + '22';
  ctx.lineWidth = 1.2;
  for (let v = 0; v < 5; v++) {
    ctx.beginPath();
    let vx = ((v * 53 + seedOffset * 17) % size);
    let vy = 0;
    ctx.moveTo(vx, vy);
    for (let step = 1; step <= 8; step++) {
      vy = (step / 8) * size;
      vx += Math.sin(step * 1.4 + v + seedOffset) * 18;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createWoodGrainTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const wave = Math.sin(y * 0.08) * 0.5 + 0.5;
    ctx.fillStyle = grainHex;
    ctx.globalAlpha = 0.04 + wave * 0.07;
    ctx.fillRect(0, y, size, 1.5);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.14,
    size / 2,
    size / 2,
    size * 0.5
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCoordinateLabelTexture(label: string, color: string): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.font = '600 34px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface ProceduralTextures {
  ivoryMarble: THREE.CanvasTexture;
  tealMarble: THREE.CanvasTexture;
  slateMarble: THREE.CanvasTexture;
  porcelainLight: THREE.CanvasTexture;
  boxwood: THREE.CanvasTexture;
  walnut: THREE.CanvasTexture;
  darkTealWood: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function buildProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  const ivoryMarble = createMarbleTexture('#F5F0E5', '#C8BC9E', 1.1);
  const tealMarble = createMarbleTexture('#174D49', '#0B2827', 2.7);
  const slateMarble = createMarbleTexture('#2C3338', '#15191C', 4.3);
  const porcelainLight = createMarbleTexture('#F4F6F8', '#CBD5E1', 5.9);
  const boxwood = createWoodGrainTexture('#EBDAC0', '#B39368');
  const walnut = createWoodGrainTexture('#5C402D', '#2D1D12');
  const darkTealWood = createWoodGrainTexture('#0E3231', '#071D1C');
  const contactShadow = createContactShadowTexture();

  const all = [
    ivoryMarble,
    tealMarble,
    slateMarble,
    porcelainLight,
    boxwood,
    walnut,
    darkTealWood,
    contactShadow,
  ];
  for (const t of all) {
    t.anisotropy = Math.min(8, maxAnisotropy);
  }

  return {
    ivoryMarble,
    tealMarble,
    slateMarble,
    porcelainLight,
    boxwood,
    walnut,
    darkTealWood,
    contactShadow,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}
