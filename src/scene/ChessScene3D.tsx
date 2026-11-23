import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BoardState,
  BoardTheme,
  Color,
  Move,
  PieceType,
  SquareIndex,
} from '../engine/types';
import { createThemeMaterialSet, ThemeMaterialSet } from './materials';
import {
  buildSharedPieceGeometries,
  createPieceMeshGroup,
  SharedPieceGeometries,
} from './pieceGeometries';
import {
  buildProceduralTextures,
  createCoordinateLabelTexture,
  ProceduralTextures,
} from './textures';
import { ChessPieceSvg } from '../components/ChessPieces';

export type CameraPreset = 'classic' | 'dramatic' | 'overhead';

interface ChessScene3DProps {
  board: BoardState;
  flipped: boolean;
  cameraPreset: CameraPreset;
  cameraResetNonce: number;
  attractMode?: boolean;
  interactive: boolean;
  selectedSquare: SquareIndex | null;
  legalMovesForSelection: Move[];
  lastMove: { from: SquareIndex; to: SquareIndex } | null;
  lastMoveIsCapture?: boolean;
  hintMove: { from: SquareIndex; to: SquareIndex } | null;
  inCheckColor: Color | null;
  capturedByWhite: PieceType[];
  capturedByBlack: PieceType[];
  pendingPromotion: { from: SquareIndex; to: SquareIndex; color: Color } | null;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  animationsEnabled: boolean;
  boardTheme: BoardTheme;
  onSquareClick: (sq: SquareIndex) => void;
  onSelectPromotion: (piece: Exclude<PieceType, 'p' | 'k'>) => void;
  onCancelPromotion: () => void;
}

const BOARD_TOP_Y = 0.06;
const HIGHLIGHT_Y = 0.066;
const FILES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const PARTICLE_COUNT = 24;

function squareToWorld(sq: SquareIndex): { x: number; z: number } {
  const row = sq >> 3;
  const col = sq & 7;
  return {
    x: col - 3.5,
    z: row - 3.5,
  };
}

function getCameraPresetPosition(preset: CameraPreset, flipped: boolean): THREE.Vector3 {
  const sign = flipped ? -1 : 1;
  if (preset === 'overhead') {
    return new THREE.Vector3(0, 11.8, 1.3 * sign);
  }
  if (preset === 'dramatic') {
    return new THREE.Vector3(0, 4.9, 9.6 * sign);
  }
  return new THREE.Vector3(0, 7.7, 8.5 * sign);
}

// Module-level reusable math helpers (zero GC in render loop)
const _mouse = new THREE.Vector2();
const _targetPos = new THREE.Vector3();
const _rookPos = new THREE.Vector3();
const _zeroVec = new THREE.Vector3(0, 0, 0);
const _dummyObj = new THREE.Object3D();

export const ChessScene3D: React.FC<ChessScene3DProps> = (props) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const propsRef = useRef(props);
  propsRef.current = props;

  const sceneApiRef = useRef<{
    syncBoard: () => void;
    syncHighlights: () => void;
    syncTheme: (theme: BoardTheme) => void;
    syncCoordinates: (visible: boolean) => void;
    syncAttractMode: (active: boolean) => void;
    triggerCameraTransition: (preset: CameraPreset, flipped: boolean) => void;
    requestRender: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL probe
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // 3. Scene & Studio Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B2A29');
    scene.fog = new THREE.FogExp2('#0B2A29', 0.022);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.45;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 80);
    camera.position.copy(
      getCameraPresetPosition(propsRef.current.cameraPreset, propsRef.current.flipped)
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(_zeroVec);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 5.6;
    controls.maxDistance = 16.5;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2 - 0.14;
    controls.enabled = !propsRef.current.attractMode;
    controls.update();

    // 5. Three-Point Warm/Cool Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xd9eff2, 0x2b241a, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    keyLight.position.set(6.5, 12.5, 7.5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 32;
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 8;
      keyLight.shadow.camera.bottom = -8;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88c9c4, 0.55);
    rimLight.position.set(-7, 6.5, -8);
    scene.add(rimLight);

    // 6. Textures, Geometries & Materials
    const textures: ProceduralTextures = buildProceduralTextures(
      renderer.capabilities.getMaxAnisotropy()
    );
    const pieceGeos: SharedPieceGeometries = buildSharedPieceGeometries();
    let currentThemeMat: ThemeMaterialSet = createThemeMaterialSet(
      propsRef.current.boardTheme,
      textures
    );

    // 7. Tabletop, Pedestal, Squares, Trays & Coordinates
    const tablePlaneGeo = new THREE.CircleGeometry(28, 64);
    const tablePlaneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0D3231'),
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.1,
    });
    const tablePlane = new THREE.Mesh(tablePlaneGeo, tablePlaneMat);
    tablePlane.rotation.x = -Math.PI / 2;
    tablePlane.position.y = -0.25;
    tablePlane.receiveShadow = true;
    scene.add(tablePlane);

    const shadowPlaneGeo = new THREE.PlaneGeometry(11.4, 11.4);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.22;
    scene.add(shadowPlane);

    // Non-coplanar vertical stack: pedestal top = +0.02, trim/grout top = +0.04, tile top = +0.06
    const pedestalGeo = new THREE.BoxGeometry(9.2, 0.24, 9.2);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, currentThemeMat.frameMaterial);
    pedestalMesh.position.y = -0.10;
    pedestalMesh.receiveShadow = true;
    pedestalMesh.castShadow = !isSoftwareGl;
    scene.add(pedestalMesh);

    const trimGeo = new THREE.BoxGeometry(8.16, 0.08, 8.16);
    const trimMesh = new THREE.Mesh(trimGeo, currentThemeMat.goldTrim);
    trimMesh.position.y = 0.0;
    trimMesh.receiveShadow = true;
    scene.add(trimMesh);

    const trayGeo = new THREE.BoxGeometry(1.7, 0.14, 7.6);
    const leftTray = new THREE.Mesh(trayGeo, currentThemeMat.trayBase);
    leftTray.position.set(-5.65, -0.15, 0);
    leftTray.receiveShadow = true;
    scene.add(leftTray);

    const rightTray = new THREE.Mesh(trayGeo, currentThemeMat.trayBase);
    rightTray.position.set(5.65, -0.15, 0);
    rightTray.receiveShadow = true;
    scene.add(rightTray);

    const trayRimGeo = new THREE.BoxGeometry(1.76, 0.04, 7.66);
    const leftTrayRim = new THREE.Mesh(trayRimGeo, currentThemeMat.goldTrim);
    leftTrayRim.position.set(-5.65, -0.21, 0);
    scene.add(leftTrayRim);

    const rightTrayRim = new THREE.Mesh(trayRimGeo, currentThemeMat.goldTrim);
    rightTrayRim.position.set(5.65, -0.21, 0);
    scene.add(rightTrayRim);

    const squareGeo = new THREE.BoxGeometry(0.985, 0.12, 0.985);
    const squareMeshes: THREE.Mesh[] = [];
    const clickableObjects: THREE.Object3D[] = [];

    for (let sq = 0; sq < 64; sq++) {
      const row = sq >> 3;
      const col = sq & 7;
      const isLight = ((row + col) & 1) === 0;
      const mat = isLight ? currentThemeMat.lightSquare : currentThemeMat.darkSquare;
      const tile = new THREE.Mesh(squareGeo, mat);
      const { x, z } = squareToWorld(sq);
      tile.position.set(x, 0.0, z);
      tile.receiveShadow = true;
      tile.userData.sq = sq;
      tile.userData.isLight = isLight;
      scene.add(tile);
      squareMeshes.push(tile);
      clickableObjects.push(tile);
    }

    // Coordinate Labels around rim
    const coordGroup = new THREE.Group();
    const coordTextures: THREE.CanvasTexture[] = [];
    const coordPlaneGeo = new THREE.PlaneGeometry(0.42, 0.42);
    const coordMaterials: THREE.MeshBasicMaterial[] = [];

    const rebuildCoordinates = (coordColor: string) => {
      while (coordGroup.children.length > 0) {
        coordGroup.remove(coordGroup.children[0]);
      }
      coordTextures.forEach((t) => t.dispose());
      coordTextures.length = 0;
      coordMaterials.forEach((m) => m.dispose());
      coordMaterials.length = 0;

      for (let i = 0; i < 8; i++) {
        const fTex = createCoordinateLabelTexture(FILES[i], coordColor);
        const fMat = new THREE.MeshBasicMaterial({
          map: fTex,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        });
        coordTextures.push(fTex);
        coordMaterials.push(fMat);

        const bottomFile = new THREE.Mesh(coordPlaneGeo, fMat);
        bottomFile.rotation.x = -Math.PI / 2;
        bottomFile.position.set(i - 3.5, 0.036, 4.34);
        coordGroup.add(bottomFile);

        const topFile = new THREE.Mesh(coordPlaneGeo, fMat);
        topFile.rotation.x = -Math.PI / 2;
        topFile.rotation.z = Math.PI;
        topFile.position.set(i - 3.5, 0.036, -4.34);
        coordGroup.add(topFile);

        const rTex = createCoordinateLabelTexture(String(8 - i), coordColor);
        const rMat = new THREE.MeshBasicMaterial({
          map: rTex,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        });
        coordTextures.push(rTex);
        coordMaterials.push(rMat);

        const leftRank = new THREE.Mesh(coordPlaneGeo, rMat);
        leftRank.rotation.x = -Math.PI / 2;
        leftRank.position.set(-4.34, 0.036, i - 3.5);
        coordGroup.add(leftRank);

        const rightRank = new THREE.Mesh(coordPlaneGeo, rMat);
        rightRank.rotation.x = -Math.PI / 2;
        rightRank.rotation.z = Math.PI;
        rightRank.position.set(4.34, 0.036, i - 3.5);
        coordGroup.add(rightRank);
      }
    };
    rebuildCoordinates(currentThemeMat.coordColor);
    coordGroup.visible = propsRef.current.showCoordinates;
    scene.add(coordGroup);

    // 8. Highlight Overlays
    const highlightGroup = new THREE.Group();
    scene.add(highlightGroup);

    const tileGlowGeo = new THREE.PlaneGeometry(0.94, 0.94);
    const legalDotGeo = new THREE.RingGeometry(0.11, 0.21, 28);
    const captureRingGeo = new THREE.RingGeometry(0.32, 0.43, 32);
    const selectedFrameGeo = new THREE.RingGeometry(0.36, 0.46, 4);
    selectedFrameGeo.rotateZ(Math.PI / 4);

    const lastMoveMat = new THREE.MeshBasicMaterial({
      color: 0xd4aa55,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const selectedMat = new THREE.MeshBasicMaterial({
      color: 0xf0d69b,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const legalDotMat = new THREE.MeshBasicMaterial({
      color: 0xd4aa55,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const captureRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const checkGlowMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0xf0d69b,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const hintMat = new THREE.MeshBasicMaterial({
      color: 0xf0d69b,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });

    const hoverMesh = new THREE.Mesh(captureRingGeo, hoverMat);
    hoverMesh.rotation.x = -Math.PI / 2;
    hoverMesh.position.y = HIGHLIGHT_Y + 0.002;
    hoverMesh.visible = false;
    scene.add(hoverMesh);

    let hintArcMesh: THREE.Mesh | null = null;

    // 9. Pooled Capture Burst Particles (InstancedMesh, zero GC)
    const shardGeo = new THREE.OctahedronGeometry(0.055, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#F0D69B'),
      emissive: new THREE.Color('#D4AA55'),
      emissiveIntensity: 0.55,
      metalness: 0.8,
      roughness: 0.25,
    });
    const burstMesh = new THREE.InstancedMesh(shardGeo, shardMat, PARTICLE_COUNT);
    burstMesh.frustumCulled = false;
    burstMesh.visible = false;
    scene.add(burstMesh);

    interface ParticleState {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
    }
    const particles: ParticleState[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.45,
    }));
    let burstActive = false;

    const triggerCaptureBurst = (sq: SquareIndex) => {
      const { x, z } = squareToWorld(sq);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 3) * 0.2;
        const speed = 1.4 + (i % 4) * 0.55;
        particles[i].x = x;
        particles[i].y = BOARD_TOP_Y + 0.22;
        particles[i].z = z;
        particles[i].vx = Math.cos(angle) * speed;
        particles[i].vy = 1.6 + (i % 5) * 0.45;
        particles[i].vz = Math.sin(angle) * speed;
        particles[i].life = 0.001;
        particles[i].maxLife = 0.42 + (i % 3) * 0.08;
      }
      burstActive = true;
      burstMesh.visible = true;
    };

    // 10. Active Pieces & Captured Pieces Groups
    const piecesRoot = new THREE.Group();
    scene.add(piecesRoot);
    const capturedRoot = new THREE.Group();
    scene.add(capturedRoot);

    interface ActiveMoveAnim {
      mesh: THREE.Group;
      fromPos: THREE.Vector3;
      toPos: THREE.Vector3;
      rookMesh: THREE.Group | null;
      rookFrom: THREE.Vector3 | null;
      rookTo: THREE.Vector3 | null;
      isCapture: boolean;
      captureSq: SquareIndex;
      burstTriggered: boolean;
      progress: number;
      duration: number;
    }

    let squarePieceMap = new Map<SquareIndex, THREE.Group>();
    let lastRenderedBoardKey = '';
    let activeAnim: ActiveMoveAnim | null = null;
    let selectedLiftTargetSq: SquareIndex | null = null;

    const clearGroup = (grp: THREE.Group) => {
      while (grp.children.length > 0) {
        grp.remove(grp.children[0]);
      }
    };

    const assignSquareUserData = (grp: THREE.Group, sq: SquareIndex) => {
      grp.userData.sq = sq;
      grp.traverse((child) => {
        child.userData.sq = sq;
      });
    };

    const syncCapturedTrays = () => {
      clearGroup(capturedRoot);
      const { capturedByWhite, capturedByBlack } = propsRef.current;

      capturedByWhite.forEach((pt, idx) => {
        const grp = createPieceMeshGroup(pt, 'b', pieceGeos, currentThemeMat);
        grp.scale.setScalar(0.66);
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        grp.position.set(5.32 + col * 0.65, -0.08, -2.9 + row * 0.82);
        capturedRoot.add(grp);
      });

      capturedByBlack.forEach((pt, idx) => {
        const grp = createPieceMeshGroup(pt, 'w', pieceGeos, currentThemeMat);
        grp.scale.setScalar(0.66);
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        grp.position.set(-5.32 - col * 0.65, -0.08, 2.9 - row * 0.82);
        capturedRoot.add(grp);
      });
    };

    const syncBoardPieces = () => {
      const { board, lastMove, lastMoveIsCapture, animationsEnabled } = propsRef.current;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const canAnimate = animationsEnabled && !reducedMotion;

      const key = board.squares.map((p) => (p ? `${p.color}${p.type}` : '.')).join('');
      const prevMove = lastMove;

      let animatedTargetSq: SquareIndex | null = null;
      let animStartPos: THREE.Vector3 | null = null;
      let rookAnimTargetSq: SquareIndex | null = null;
      let rookAnimStartSq: SquareIndex | null = null;

      if (canAnimate && prevMove && lastRenderedBoardKey !== '' && lastRenderedBoardKey !== key) {
        const movedPiece = board.squares[prevMove.to];
        if (movedPiece && squarePieceMap.has(prevMove.from)) {
          animatedTargetSq = prevMove.to;
          const startWorld = squareToWorld(prevMove.from);
          animStartPos = new THREE.Vector3(startWorld.x, BOARD_TOP_Y, startWorld.z);

          // Detect castling rook slide
          if (movedPiece.type === 'k' && Math.abs(prevMove.to - prevMove.from) === 2) {
            if (prevMove.to === 62) {
              rookAnimStartSq = 63;
              rookAnimTargetSq = 61;
            } else if (prevMove.to === 58) {
              rookAnimStartSq = 56;
              rookAnimTargetSq = 59;
            } else if (prevMove.to === 6) {
              rookAnimStartSq = 7;
              rookAnimTargetSq = 5;
            } else if (prevMove.to === 2) {
              rookAnimStartSq = 0;
              rookAnimTargetSq = 3;
            }
          }
        }
      }

      lastRenderedBoardKey = key;
      activeAnim = null;

      clearGroup(piecesRoot);
      squarePieceMap = new Map();

      let animatedKingMesh: THREE.Group | null = null;
      let animatedKingTo: THREE.Vector3 | null = null;
      let animatedRookMesh: THREE.Group | null = null;
      let animatedRookFrom: THREE.Vector3 | null = null;
      let animatedRookTo: THREE.Vector3 | null = null;

      for (let sq = 0; sq < 64; sq++) {
        const p = board.squares[sq];
        if (!p) continue;
        const grp = createPieceMeshGroup(p.type, p.color, pieceGeos, currentThemeMat);
        const { x, z } = squareToWorld(sq);
        grp.position.set(x, BOARD_TOP_Y, z);
        assignSquareUserData(grp, sq);
        piecesRoot.add(grp);
        squarePieceMap.set(sq, grp);

        if (animatedTargetSq === sq && animStartPos) {
          grp.position.copy(animStartPos);
          animatedKingMesh = grp;
          animatedKingTo = new THREE.Vector3(x, BOARD_TOP_Y, z);
        } else if (rookAnimTargetSq === sq && rookAnimStartSq !== null) {
          const rStart = squareToWorld(rookAnimStartSq);
          animatedRookFrom = new THREE.Vector3(rStart.x, BOARD_TOP_Y, rStart.z);
          animatedRookTo = new THREE.Vector3(x, BOARD_TOP_Y, z);
          grp.position.copy(animatedRookFrom);
          animatedRookMesh = grp;
        }
      }

      if (animatedKingMesh && animStartPos && animatedKingTo && prevMove) {
        activeAnim = {
          mesh: animatedKingMesh,
          fromPos: animStartPos,
          toPos: animatedKingTo,
          rookMesh: animatedRookMesh,
          rookFrom: animatedRookFrom,
          rookTo: animatedRookTo,
          isCapture: Boolean(lastMoveIsCapture),
          captureSq: prevMove.to,
          burstTriggered: false,
          progress: 0,
          duration: 0.28,
        };
      }

      syncCapturedTrays();
      requestRender();
    };

    const syncHighlights = () => {
      clearGroup(highlightGroup);
      if (hintArcMesh) {
        hintArcMesh.geometry.dispose();
        hintArcMesh = null;
      }

      const {
        selectedSquare,
        legalMovesForSelection,
        lastMove,
        hintMove,
        inCheckColor,
        board,
        showLegalMoves,
        attractMode,
      } = propsRef.current;

      selectedLiftTargetSq = attractMode ? null : selectedSquare;
      if (attractMode) {
        requestRender();
        return;
      }

      if (lastMove) {
        for (const sq of [lastMove.from, lastMove.to]) {
          const m = new THREE.Mesh(tileGlowGeo, lastMoveMat);
          const { x, z } = squareToWorld(sq);
          m.rotation.x = -Math.PI / 2;
          m.position.set(x, HIGHLIGHT_Y, z);
          highlightGroup.add(m);
        }
      }

      if (inCheckColor) {
        const kSq = board.kingSq[inCheckColor];
        const { x, z } = squareToWorld(kSq);
        const m = new THREE.Mesh(tileGlowGeo, checkGlowMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, HIGHLIGHT_Y + 0.001, z);
        highlightGroup.add(m);
      }

      if (selectedSquare !== null) {
        const { x, z } = squareToWorld(selectedSquare);
        const m = new THREE.Mesh(selectedFrameGeo, selectedMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, HIGHLIGHT_Y + 0.002, z);
        highlightGroup.add(m);
      }

      if (showLegalMoves && legalMovesForSelection.length > 0) {
        const seenTargets = new Set<SquareIndex>();
        for (const mv of legalMovesForSelection) {
          if (seenTargets.has(mv.to)) continue;
          seenTargets.add(mv.to);
          const { x, z } = squareToWorld(mv.to);
          const isCapture = Boolean(mv.captured || mv.isEnPassant);
          const m = new THREE.Mesh(
            isCapture ? captureRingGeo : legalDotGeo,
            isCapture ? captureRingMat : legalDotMat
          );
          m.rotation.x = -Math.PI / 2;
          m.position.set(x, HIGHLIGHT_Y + 0.003, z);
          highlightGroup.add(m);
        }
      }

      if (hintMove) {
        const start = squareToWorld(hintMove.from);
        const end = squareToWorld(hintMove.to);
        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(start.x, BOARD_TOP_Y + 0.12, start.z),
          new THREE.Vector3(midX, BOARD_TOP_Y + 1.35, midZ),
          new THREE.Vector3(end.x, BOARD_TOP_Y + 0.14, end.z)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.045, 8, false);
        hintArcMesh = new THREE.Mesh(tubeGeo, hintMat);
        highlightGroup.add(hintArcMesh);

        const targetRing = new THREE.Mesh(captureRingGeo, selectedMat);
        targetRing.rotation.x = -Math.PI / 2;
        targetRing.position.set(end.x, HIGHLIGHT_Y + 0.004, end.z);
        highlightGroup.add(targetRing);
      }

      requestRender();
    };

    const syncTheme = (theme: BoardTheme) => {
      const prevMat = currentThemeMat;
      currentThemeMat = createThemeMaterialSet(theme, textures);

      pedestalMesh.material = currentThemeMat.frameMaterial;
      trimMesh.material = currentThemeMat.goldTrim;
      leftTray.material = currentThemeMat.trayBase;
      rightTray.material = currentThemeMat.trayBase;
      leftTrayRim.material = currentThemeMat.goldTrim;
      rightTrayRim.material = currentThemeMat.goldTrim;

      squareMeshes.forEach((tile) => {
        tile.material = tile.userData.isLight
          ? currentThemeMat.lightSquare
          : currentThemeMat.darkSquare;
      });

      rebuildCoordinates(currentThemeMat.coordColor);
      lastRenderedBoardKey = '';
      syncBoardPieces();
      prevMat.dispose();
    };

    // 11. Camera Preset Transitions & Attract Mode Orbit
    let cameraGoal: THREE.Vector3 | null = null;
    let attractAngle = 0.45;

    const triggerCameraTransition = (preset: CameraPreset, flipped: boolean) => {
      if (propsRef.current.attractMode) return;
      cameraGoal = getCameraPresetPosition(preset, flipped);
      requestRender();
    };

    const onControlsStart = () => {
      cameraGoal = null;
    };
    const onControlsChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', onControlsChange);

    // 12. On-Demand Coalesced Render Loop with Software WebGL pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTickTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTickTime) / 1000));
        lastTickTime = now;

        let needsMoreFrames = false;

        // Title screen serene live-world camera pan
        if (propsRef.current.attractMode) {
          const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!reducedMotion) {
            attractAngle += dt * 0.14;
            needsMoreFrames = true;
          }
          const radius = 10.6;
          camera.position.set(
            Math.sin(attractAngle) * radius,
            6.8,
            Math.cos(attractAngle) * radius
          );
          camera.lookAt(_zeroVec);
        } else if (cameraGoal) {
          camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraGoal.x, 7, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraGoal.y, 7, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraGoal.z, 7, dt);
          if (camera.position.distanceTo(cameraGoal) < 0.02) {
            camera.position.copy(cameraGoal);
            cameraGoal = null;
          } else {
            needsMoreFrames = true;
          }
        }

        // Smooth piece movement arc + optional castling rook slide
        if (activeAnim) {
          activeAnim.progress = Math.min(1, activeAnim.progress + dt / activeAnim.duration);
          const t = activeAnim.progress;
          const eased = t * t * (3 - 2 * t);
          _targetPos.lerpVectors(activeAnim.fromPos, activeAnim.toPos, eased);
          _targetPos.y = BOARD_TOP_Y + Math.sin(t * Math.PI) * 0.92;
          activeAnim.mesh.position.copy(_targetPos);

          if (activeAnim.rookMesh && activeAnim.rookFrom && activeAnim.rookTo) {
            _rookPos.lerpVectors(activeAnim.rookFrom, activeAnim.rookTo, eased);
            _rookPos.y = BOARD_TOP_Y + Math.sin(t * Math.PI) * 0.36;
            activeAnim.rookMesh.position.copy(_rookPos);
          }

          if (activeAnim.isCapture && !activeAnim.burstTriggered && t >= 0.72) {
            activeAnim.burstTriggered = true;
            triggerCaptureBurst(activeAnim.captureSq);
          }

          if (t >= 1) {
            activeAnim.mesh.position.copy(activeAnim.toPos);
            if (activeAnim.rookMesh && activeAnim.rookTo) {
              activeAnim.rookMesh.position.copy(activeAnim.rookTo);
            }
            activeAnim = null;
          } else {
            needsMoreFrames = true;
          }
        }

        // Update pooled capture burst particles
        if (burstActive) {
          let anyAlive = false;
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = particles[i];
            if (p.life > 0 && p.life < p.maxLife) {
              p.life += dt;
              p.vy -= 7.5 * dt;
              p.x += p.vx * dt;
              p.y += p.vy * dt;
              p.z += p.vz * dt;
              const fade = Math.max(0, 1 - p.life / p.maxLife);
              _dummyObj.position.set(p.x, Math.max(BOARD_TOP_Y, p.y), p.z);
              _dummyObj.rotation.set(p.life * 7, p.life * 5, 0);
              _dummyObj.scale.setScalar(fade);
              _dummyObj.updateMatrix();
              burstMesh.setMatrixAt(i, _dummyObj.matrix);
              anyAlive = true;
            } else {
              _dummyObj.scale.setScalar(0);
              _dummyObj.updateMatrix();
              burstMesh.setMatrixAt(i, _dummyObj.matrix);
            }
          }
          burstMesh.instanceMatrix.needsUpdate = true;
          if (!anyAlive) {
            burstActive = false;
            burstMesh.visible = false;
          } else {
            needsMoreFrames = true;
          }
        }

        // Selected piece gentle elevation
        squarePieceMap.forEach((grp, sq) => {
          if (activeAnim && (activeAnim.mesh === grp || activeAnim.rookMesh === grp)) return;
          const targetY =
            sq === selectedLiftTargetSq ? BOARD_TOP_Y + 0.18 : BOARD_TOP_Y;
          if (Math.abs(grp.position.y - targetY) > 0.003) {
            grp.position.y = THREE.MathUtils.damp(grp.position.y, targetY, 14, dt);
            needsMoreFrames = true;
          } else {
            grp.position.y = targetY;
          }
        });

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    // 13. Pointer Interaction
    const raycaster = new THREE.Raycaster();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const raycastSquareFromEvent = (e: PointerEvent): SquareIndex | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_mouse, camera);

      const targets = [...clickableObjects, ...piecesRoot.children];
      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length === 0) return null;
      const sq = hits[0].object.userData.sq;
      return typeof sq === 'number' ? sq : null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || propsRef.current.attractMode) return;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || !propsRef.current.interactive || propsRef.current.attractMode) return;
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;

      const sq = raycastSquareFromEvent(e);
      if (sq !== null) {
        propsRef.current.onSquareClick(sq);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (propsRef.current.attractMode) {
        renderer.domElement.style.cursor = 'default';
        return;
      }
      const now = performance.now();
      if (now - lastHoverCheck < 40) return;
      lastHoverCheck = now;

      if (!propsRef.current.interactive) {
        if (hoverMesh.visible) {
          hoverMesh.visible = false;
          requestRender();
        }
        renderer.domElement.style.cursor = 'grab';
        return;
      }

      const sq = raycastSquareFromEvent(e);
      if (sq !== null) {
        const piece = propsRef.current.board.squares[sq];
        const isFriendly = Boolean(piece && piece.color === propsRef.current.board.turn);
        const isLegalTarget = propsRef.current.legalMovesForSelection.some(
          (m) => m.to === sq
        );
        if (isFriendly || isLegalTarget) {
          const { x, z } = squareToWorld(sq);
          hoverMesh.position.set(x, HIGHLIGHT_Y + 0.002, z);
          hoverMesh.visible = true;
          renderer.domElement.style.cursor = 'pointer';
          requestRender();
          return;
        }
      }

      if (hoverMesh.visible) {
        hoverMesh.visible = false;
        requestRender();
      }
      renderer.domElement.style.cursor = 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const resizeObserver = new ResizeObserver(() => {
      if (disposed || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneApiRef.current = {
      syncBoard: syncBoardPieces,
      syncHighlights,
      syncTheme,
      syncCoordinates: (visible: boolean) => {
        coordGroup.visible = visible;
        requestRender();
      },
      syncAttractMode: (active: boolean) => {
        controls.enabled = !active;
        hoverMesh.visible = false;
        if (!active) {
          cameraGoal = getCameraPresetPosition(
            propsRef.current.cameraPreset,
            propsRef.current.flipped
          );
        }
        requestRender();
      },
      triggerCameraTransition,
      requestRender,
    };

    syncBoardPieces();
    syncHighlights();
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      tablePlaneGeo.dispose();
      tablePlaneMat.dispose();
      shadowPlaneGeo.dispose();
      shadowPlaneMat.dispose();
      pedestalGeo.dispose();
      trimGeo.dispose();
      trayGeo.dispose();
      trayRimGeo.dispose();
      squareGeo.dispose();
      coordPlaneGeo.dispose();
      coordTextures.forEach((t) => t.dispose());
      coordMaterials.forEach((m) => m.dispose());
      tileGlowGeo.dispose();
      legalDotGeo.dispose();
      captureRingGeo.dispose();
      selectedFrameGeo.dispose();
      lastMoveMat.dispose();
      selectedMat.dispose();
      legalDotMat.dispose();
      captureRingMat.dispose();
      checkGlowMat.dispose();
      hoverMat.dispose();
      hintMat.dispose();
      shardGeo.dispose();
      shardMat.dispose();
      if (hintArcMesh) hintArcMesh.geometry.dispose();

      pieceGeos.dispose();
      currentThemeMat.dispose();
      textures.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneApiRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneApiRef.current?.syncBoard();
  }, [props.board, props.capturedByWhite, props.capturedByBlack]);

  useEffect(() => {
    sceneApiRef.current?.syncHighlights();
  }, [
    props.selectedSquare,
    props.legalMovesForSelection,
    props.lastMove,
    props.hintMove,
    props.inCheckColor,
    props.showLegalMoves,
    props.attractMode,
  ]);

  useEffect(() => {
    sceneApiRef.current?.syncTheme(props.boardTheme);
  }, [props.boardTheme]);

  useEffect(() => {
    sceneApiRef.current?.syncCoordinates(props.showCoordinates);
  }, [props.showCoordinates]);

  useEffect(() => {
    sceneApiRef.current?.syncAttractMode(Boolean(props.attractMode));
  }, [props.attractMode]);

  useEffect(() => {
    sceneApiRef.current?.triggerCameraTransition(props.cameraPreset, props.flipped);
  }, [props.cameraPreset, props.flipped, props.cameraResetNonce]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0B2A29]">
      <div ref={mountRef} className="w-full h-full" />

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B2A29] text-[#F5F0E5] p-6 text-center">
          <div className="max-w-sm space-y-2">
            <h3 className="font-display text-2xl font-bold text-[#F0D69B]">
              Restoring 3D Board
            </h3>
            <p className="text-xs text-[#F5F0E5]/75">
              Graphics context paused by browser. Restoring hardware rendering...
            </p>
          </div>
        </div>
      )}

      {props.pendingPromotion && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose promotion piece"
        >
          <div className="rounded-xl border border-[#D4AA55]/55 bg-[#103C3B] p-5 shadow-2xl text-center">
            <h3 className="font-display text-2xl font-bold text-[#F0D69B]">
              Promote Pawn
            </h3>
            <p className="mt-1 text-xs text-[#F5F0E5]/75">
              Select a piece to complete your move
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {(['q', 'r', 'b', 'n'] as const).map((promoType) => {
                const labels: Record<typeof promoType, string> = {
                  q: 'Queen',
                  r: 'Rook',
                  b: 'Bishop',
                  n: 'Knight',
                };
                return (
                  <button
                    key={promoType}
                    type="button"
                    onClick={() => props.onSelectPromotion(promoType)}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-[#D4AA55]/30 bg-[#174D49] hover:bg-[#1E5E59] hover:border-[#D4AA55] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#D4AA55]"
                  >
                    <div className="w-11 h-11">
                      <ChessPieceSvg color={props.pendingPromotion!.color} type={promoType} />
                    </div>
                    <span className="text-xs font-medium text-[#F5F0E5]">
                      {labels[promoType]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={props.onCancelPromotion}
              className="mt-4 px-4 py-1.5 text-xs font-medium text-[#F5F0E5]/75 hover:text-[#F5F0E5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
