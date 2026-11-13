import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphalt: THREE.CanvasTexture;
  highway: THREE.CanvasTexture;
  villageRoad: THREE.CanvasTexture;
  zebraCrossing: THREE.CanvasTexture;
  speedBreaker: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  water: THREE.CanvasTexture;
  terracottaRoof: THREE.CanvasTexture;
  buildingFacadeModern: THREE.CanvasTexture;
  buildingFacadeIndian: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  createSignTexture: (
    title: string,
    subtitle: string,
    bgColor: string,
    textColor: string,
    accentColor?: string
  ) => THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const created: THREE.Texture[] = [];

  const register = (tex: THREE.CanvasTexture, repeatX = 1, repeatY = 1, isColor = true) => {
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.anisotropy = maxAnisotropy;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.needsUpdate = true;
    created.push(tex);
    return tex;
  };

  // 1. City Asphalt Texture (dark worn asphalt with dashed center divider)
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 512;
  asphaltCanvas.height = 512;
  const actx = asphaltCanvas.getContext('2d')!;
  actx.fillStyle = '#2a2e35';
  actx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    const shade = 32 + Math.floor(Math.random() * 28);
    actx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
    actx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  // White edge lines
  actx.fillStyle = '#e2e8f0';
  actx.fillRect(18, 0, 10, 512);
  actx.fillRect(484, 0, 10, 512);
  // Yellow dashed center line
  actx.fillStyle = '#facc15';
  for (let y = 20; y < 512; y += 128) {
    actx.fillRect(250, y, 12, 72);
  }
  const asphalt = register(new THREE.CanvasTexture(asphaltCanvas), 1, 1);

  // 2. National Highway Texture (4-lane divided look)
  const hwCanvas = document.createElement('canvas');
  hwCanvas.width = 512;
  hwCanvas.height = 512;
  const hctx = hwCanvas.getContext('2d')!;
  hctx.fillStyle = '#23272e';
  hctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    const shade = 26 + Math.floor(Math.random() * 24);
    hctx.fillStyle = `rgb(${shade},${shade + 1},${shade + 4})`;
    hctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  // Outer shoulders
  hctx.fillStyle = '#f8fafc';
  hctx.fillRect(14, 0, 10, 512);
  hctx.fillRect(488, 0, 10, 512);
  // Double yellow median
  hctx.fillStyle = '#f59e0b';
  hctx.fillRect(244, 0, 8, 512);
  hctx.fillRect(260, 0, 8, 512);
  // Dashed lane lines
  hctx.fillStyle = '#e2e8f0';
  for (let y = 16; y < 512; y += 128) {
    hctx.fillRect(130, y, 8, 64);
    hctx.fillRect(374, y, 8, 64);
  }
  const highway = register(new THREE.CanvasTexture(hwCanvas), 1, 1);

  // 3. Village / Kerala Narrow Road
  const vilCanvas = document.createElement('canvas');
  vilCanvas.width = 512;
  vilCanvas.height = 512;
  const vctx = vilCanvas.getContext('2d')!;
  vctx.fillStyle = '#3f3d39';
  vctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) {
    const r = 50 + Math.floor(Math.random() * 35);
    vctx.fillStyle = `rgb(${r},${r - 3},${r - 8})`;
    vctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  // Dusty red-soil shoulder edges
  vctx.fillStyle = '#7c4a2d';
  vctx.fillRect(0, 0, 32, 512);
  vctx.fillRect(480, 0, 32, 512);
  // Faded white dashed line
  vctx.fillStyle = 'rgba(241, 245, 249, 0.65)';
  for (let y = 30; y < 512; y += 170) {
    vctx.fillRect(252, y, 8, 70);
  }
  const villageRoad = register(new THREE.CanvasTexture(vilCanvas), 1, 1);

  // 4. Zebra Crossing
  const zCanvas = document.createElement('canvas');
  zCanvas.width = 256;
  zCanvas.height = 128;
  const zctx = zCanvas.getContext('2d')!;
  zctx.fillStyle = '#2a2e35';
  zctx.fillRect(0, 0, 256, 128);
  zctx.fillStyle = '#f8fafc';
  for (let x = 12; x < 244; x += 36) {
    zctx.fillRect(x, 10, 20, 108);
  }
  const zebraCrossing = register(new THREE.CanvasTexture(zCanvas), 1, 1);

  // 5. Indian Speed Breaker (Yellow & Black chevrons)
  const sbCanvas = document.createElement('canvas');
  sbCanvas.width = 256;
  sbCanvas.height = 64;
  const sbctx = sbCanvas.getContext('2d')!;
  sbctx.fillStyle = '#eab308';
  sbctx.fillRect(0, 0, 256, 64);
  sbctx.fillStyle = '#111827';
  for (let x = 0; x < 256; x += 32) {
    sbctx.fillRect(x, 0, 16, 64);
  }
  const speedBreaker = register(new THREE.CanvasTexture(sbCanvas), 1, 1);

  // 6. Lush Grass & Paddy Field Texture
  const gCanvas = document.createElement('canvas');
  gCanvas.width = 256;
  gCanvas.height = 256;
  const gctx = gCanvas.getContext('2d')!;
  gctx.fillStyle = '#3d6b35';
  gctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    const g = 85 + Math.floor(Math.random() * 48);
    gctx.fillStyle = `rgb(${Math.floor(g * 0.55)},${g},${Math.floor(g * 0.45)})`;
    gctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const grass = register(new THREE.CanvasTexture(gCanvas), 40, 40);

  // 7. Beach Sand
  const sCanvas = document.createElement('canvas');
  sCanvas.width = 256;
  sCanvas.height = 256;
  const sctx = sCanvas.getContext('2d')!;
  sctx.fillStyle = '#dfc592';
  sctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4500; i++) {
    const v = 195 + Math.floor(Math.random() * 40);
    sctx.fillStyle = `rgb(${v},${v - 20},${v - 60})`;
    sctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const sand = register(new THREE.CanvasTexture(sCanvas), 24, 8);

  // 8. Arabian Sea / Backwater Texture
  const wCanvas = document.createElement('canvas');
  wCanvas.width = 256;
  wCanvas.height = 256;
  const wctx = wCanvas.getContext('2d')!;
  wctx.fillStyle = '#0c7b93';
  wctx.fillRect(0, 0, 256, 256);
  wctx.strokeStyle = 'rgba(255,255,255,0.22)';
  wctx.lineWidth = 2;
  for (let y = 16; y < 256; y += 32) {
    wctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      wctx.lineTo(x, y + Math.sin((x / 256) * Math.PI * 4) * 4);
    }
    wctx.stroke();
  }
  const water = register(new THREE.CanvasTexture(wCanvas), 20, 12);

  // 9. Kerala Terracotta Roof Tile
  const tCanvas = document.createElement('canvas');
  tCanvas.width = 256;
  tCanvas.height = 256;
  const tctx = tCanvas.getContext('2d')!;
  tctx.fillStyle = '#9a3412';
  tctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 24) {
    tctx.fillStyle = y % 48 === 0 ? '#b45309' : '#7c2d12';
    tctx.fillRect(0, y, 256, 3);
    for (let x = 0; x < 256; x += 24) {
      tctx.fillStyle = 'rgba(0,0,0,0.2)';
      tctx.fillRect(x, y, 2, 24);
    }
  }
  const terracottaRoof = register(new THREE.CanvasTexture(tCanvas), 2, 2);

  // 10. Modern City Building Facade (glass + concrete bands)
  const fmCanvas = document.createElement('canvas');
  fmCanvas.width = 256;
  fmCanvas.height = 256;
  const fmctx = fmCanvas.getContext('2d')!;
  fmctx.fillStyle = '#cbd5e1';
  fmctx.fillRect(0, 0, 256, 256);
  for (let y = 12; y < 256; y += 32) {
    fmctx.fillStyle = '#1e293b';
    fmctx.fillRect(8, y, 240, 18);
    for (let x = 14; x < 240; x += 28) {
      fmctx.fillStyle = Math.random() > 0.25 ? '#38bdf8' : '#fef08a';
      fmctx.fillRect(x, y + 3, 20, 12);
    }
  }
  const buildingFacadeModern = register(new THREE.CanvasTexture(fmCanvas), 1, 2);

  // 11. Indian Residential Apartment Facade (warm stucco + balconies)
  const fiCanvas = document.createElement('canvas');
  fiCanvas.width = 256;
  fiCanvas.height = 256;
  const fictx = fiCanvas.getContext('2d')!;
  fictx.fillStyle = '#f3e5ab';
  fictx.fillRect(0, 0, 256, 256);
  for (let y = 16; y < 256; y += 42) {
    for (let x = 16; x < 240; x += 58) {
      fictx.fillStyle = '#475569';
      fictx.fillRect(x, y, 40, 24);
      fictx.fillStyle = Math.random() > 0.4 ? '#93c5fd' : '#fde68a';
      fictx.fillRect(x + 4, y + 3, 32, 16);
      // Balcony grill
      fictx.fillStyle = '#1e293b';
      fictx.fillRect(x - 2, y + 20, 44, 6);
    }
  }
  const buildingFacadeIndian = register(new THREE.CanvasTexture(fiCanvas), 1, 2);

  // 12. Radial Contact Shadow
  const csCanvas = document.createElement('canvas');
  csCanvas.width = 128;
  csCanvas.height = 128;
  const csctx = csCanvas.getContext('2d')!;
  const grad = csctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.35)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  csctx.fillStyle = grad;
  csctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(csCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;
  created.push(contactShadow);

  const createSignTexture = (
    title: string,
    subtitle: string,
    bgColor: string,
    textColor: string,
    accentColor = '#facc15'
  ) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 192;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, subtitle ? 74 : 96, 460);

    if (subtitle) {
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(subtitle, 256, 134, 460);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    created.push(tex);
    return tex;
  };

  return {
    asphalt,
    highway,
    villageRoad,
    zebraCrossing,
    speedBreaker,
    grass,
    sand,
    water,
    terracottaRoof,
    buildingFacadeModern,
    buildingFacadeIndian,
    contactShadow,
    createSignTexture,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}
