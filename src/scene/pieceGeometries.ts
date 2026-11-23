import * as THREE from 'three';
import { Color, PieceType } from '../engine/types';
import { ThemeMaterialSet } from './materials';

/**
 * Shared procedural geometries for multi-part composite sculpted Staunton pieces.
 * Every piece sits flush at y = 0 (bottom-center pivot).
 */
export interface SharedPieceGeometries {
  pawnBody: THREE.LatheGeometry;
  pawnCollar: THREE.TorusGeometry;
  pawnHead: THREE.SphereGeometry;

  rookBody: THREE.LatheGeometry;
  rookCollar: THREE.TorusGeometry;
  rookMerlon: THREE.BoxGeometry;
  rookCap: THREE.CylinderGeometry;

  knightBase: THREE.LatheGeometry;
  knightCollar: THREE.TorusGeometry;
  knightHead: THREE.ExtrudeGeometry;
  knightEar: THREE.ConeGeometry;

  bishopBody: THREE.LatheGeometry;
  bishopCollar: THREE.TorusGeometry;
  bishopFinial: THREE.SphereGeometry;
  bishopBand: THREE.TorusGeometry;

  queenBody: THREE.LatheGeometry;
  queenCollar: THREE.TorusGeometry;
  queenCrownTip: THREE.SphereGeometry;
  queenOrb: THREE.SphereGeometry;
  queenSpike: THREE.ConeGeometry;

  kingBody: THREE.LatheGeometry;
  kingCollar: THREE.TorusGeometry;
  kingCross: THREE.ExtrudeGeometry;
  kingCrownRing: THREE.TorusGeometry;

  dispose: () => void;
}

function makeLathe(pts: [number, number][], segments = 28): THREE.LatheGeometry {
  const vectors = pts.map(([r, y]) => new THREE.Vector2(r, y));
  const geo = new THREE.LatheGeometry(vectors, segments);
  geo.computeVertexNormals();
  return geo;
}

export function buildSharedPieceGeometries(): SharedPieceGeometries {
  // Pawn (~0.72m tall)
  const pawnBody = makeLathe([
    [0.0, 0.0],
    [0.27, 0.0],
    [0.27, 0.06],
    [0.23, 0.1],
    [0.24, 0.14],
    [0.16, 0.2],
    [0.11, 0.36],
    [0.09, 0.48],
    [0.14, 0.51],
    [0.08, 0.54],
    [0.0, 0.55],
  ]);
  const pawnCollar = new THREE.TorusGeometry(0.145, 0.018, 10, 28);
  const pawnHead = new THREE.SphereGeometry(0.135, 24, 18);

  // Rook (~0.84m tall)
  const rookBody = makeLathe([
    [0.0, 0.0],
    [0.31, 0.0],
    [0.31, 0.07],
    [0.26, 0.12],
    [0.27, 0.16],
    [0.19, 0.24],
    [0.165, 0.52],
    [0.21, 0.6],
    [0.235, 0.65],
    [0.235, 0.74],
    [0.175, 0.74],
    [0.175, 0.69],
    [0.0, 0.69],
  ]);
  const rookCollar = new THREE.TorusGeometry(0.215, 0.02, 10, 28);
  const rookMerlon = new THREE.BoxGeometry(0.085, 0.09, 0.07);
  const rookCap = new THREE.CylinderGeometry(0.175, 0.175, 0.02, 24);

  // Knight (~0.92m tall): turned base + extruded bevelled stallion head
  const knightBase = makeLathe([
    [0.0, 0.0],
    [0.31, 0.0],
    [0.31, 0.07],
    [0.26, 0.12],
    [0.27, 0.17],
    [0.19, 0.24],
    [0.17, 0.32],
    [0.0, 0.33],
  ]);
  const knightCollar = new THREE.TorusGeometry(0.185, 0.02, 10, 28);

  const horseShape = new THREE.Shape();
  horseShape.moveTo(-0.14, 0.0);
  horseShape.lineTo(0.14, 0.0);
  horseShape.quadraticCurveTo(0.18, 0.18, 0.14, 0.36);
  horseShape.quadraticCurveTo(0.09, 0.5, -0.02, 0.55);
  horseShape.lineTo(-0.07, 0.61); // crest
  horseShape.lineTo(-0.09, 0.52);
  horseShape.quadraticCurveTo(-0.2, 0.45, -0.23, 0.34); // muzzle bridge
  horseShape.lineTo(-0.18, 0.29); // nostril/mouth
  horseShape.quadraticCurveTo(-0.06, 0.33, 0.01, 0.28); // jaw
  horseShape.quadraticCurveTo(-0.12, 0.16, -0.14, 0.0);

  const knightHead = new THREE.ExtrudeGeometry(horseShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.026,
    bevelSegments: 4,
    curveSegments: 14,
  });
  knightHead.translate(0, 0, -0.07);
  knightHead.computeVertexNormals();
  const knightEar = new THREE.ConeGeometry(0.035, 0.11, 10);

  // Bishop (~0.98m tall)
  const bishopBody = makeLathe([
    [0.0, 0.0],
    [0.3, 0.0],
    [0.3, 0.07],
    [0.25, 0.12],
    [0.26, 0.16],
    [0.17, 0.23],
    [0.125, 0.48],
    [0.17, 0.54],
    [0.11, 0.58],
    [0.165, 0.72],
    [0.12, 0.85],
    [0.045, 0.92],
    [0.0, 0.93],
  ]);
  const bishopCollar = new THREE.TorusGeometry(0.172, 0.02, 10, 28);
  const bishopBand = new THREE.TorusGeometry(0.145, 0.014, 8, 24);
  const bishopFinial = new THREE.SphereGeometry(0.052, 18, 14);

  // Queen (~1.12m tall)
  const queenBody = makeLathe([
    [0.0, 0.0],
    [0.33, 0.0],
    [0.33, 0.075],
    [0.275, 0.13],
    [0.29, 0.18],
    [0.185, 0.26],
    [0.135, 0.58],
    [0.19, 0.65],
    [0.125, 0.7],
    [0.17, 0.88],
    [0.22, 0.99],
    [0.16, 0.99],
    [0.13, 0.92],
    [0.0, 0.92],
  ]);
  const queenCollar = new THREE.TorusGeometry(0.195, 0.022, 10, 28);
  const queenSpike = new THREE.ConeGeometry(0.032, 0.11, 10);
  const queenCrownTip = new THREE.SphereGeometry(0.026, 12, 10);
  const queenOrb = new THREE.SphereGeometry(0.078, 20, 16);

  // King (~1.24m tall)
  const kingBody = makeLathe([
    [0.0, 0.0],
    [0.34, 0.0],
    [0.34, 0.08],
    [0.285, 0.14],
    [0.3, 0.19],
    [0.195, 0.28],
    [0.145, 0.64],
    [0.21, 0.72],
    [0.14, 0.77],
    [0.18, 0.95],
    [0.22, 1.04],
    [0.16, 1.07],
    [0.0, 1.07],
  ]);
  const kingCollar = new THREE.TorusGeometry(0.212, 0.022, 10, 28);
  const kingCrownRing = new THREE.TorusGeometry(0.19, 0.018, 10, 28);

  const crossShape = new THREE.Shape();
  const arm = 0.034;
  const len = 0.095;
  crossShape.moveTo(-arm, -len);
  crossShape.lineTo(arm, -len);
  crossShape.lineTo(arm, -arm);
  crossShape.lineTo(len, -arm);
  crossShape.lineTo(len, arm);
  crossShape.lineTo(arm, arm);
  crossShape.lineTo(arm, len);
  crossShape.lineTo(-arm, len);
  crossShape.lineTo(-arm, arm);
  crossShape.lineTo(-len, arm);
  crossShape.lineTo(-len, -arm);
  crossShape.lineTo(-arm, -arm);
  crossShape.closePath();

  const kingCross = new THREE.ExtrudeGeometry(crossShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  kingCross.translate(0, 0, -0.021);
  kingCross.computeVertexNormals();

  const allGeos: THREE.BufferGeometry[] = [
    pawnBody,
    pawnCollar,
    pawnHead,
    rookBody,
    rookCollar,
    rookMerlon,
    rookCap,
    knightBase,
    knightCollar,
    knightHead,
    knightEar,
    bishopBody,
    bishopCollar,
    bishopFinial,
    bishopBand,
    queenBody,
    queenCollar,
    queenCrownTip,
    queenOrb,
    queenSpike,
    kingBody,
    kingCollar,
    kingCross,
    kingCrownRing,
  ];

  return {
    pawnBody,
    pawnCollar,
    pawnHead,
    rookBody,
    rookCollar,
    rookMerlon,
    rookCap,
    knightBase,
    knightCollar,
    knightHead,
    knightEar,
    bishopBody,
    bishopCollar,
    bishopFinial,
    bishopBand,
    queenBody,
    queenCollar,
    queenCrownTip,
    queenOrb,
    queenSpike,
    kingBody,
    kingCollar,
    kingCross,
    kingCrownRing,
    dispose: () => {
      allGeos.forEach((g) => g.dispose());
    },
  };
}

export function createPieceMeshGroup(
  type: PieceType,
  color: Color,
  geos: SharedPieceGeometries,
  mats: ThemeMaterialSet
): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = color === 'w' ? mats.whiteBody : mats.blackBody;
  const accentMat = color === 'w' ? mats.whiteAccent : mats.blackAccent;

  const enableShadows = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  if (type === 'p') {
    group.add(enableShadows(new THREE.Mesh(geos.pawnBody, bodyMat)));
    const collar = enableShadows(new THREE.Mesh(geos.pawnCollar, accentMat));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.51;
    group.add(collar);
    const head = enableShadows(new THREE.Mesh(geos.pawnHead, bodyMat));
    head.position.y = 0.64;
    group.add(head);
  } else if (type === 'r') {
    group.add(enableShadows(new THREE.Mesh(geos.rookBody, bodyMat)));
    const collar = enableShadows(new THREE.Mesh(geos.rookCollar, accentMat));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.6;
    group.add(collar);
    const cap = enableShadows(new THREE.Mesh(geos.rookCap, accentMat));
    cap.position.y = 0.695;
    group.add(cap);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const merlon = enableShadows(new THREE.Mesh(geos.rookMerlon, bodyMat));
      merlon.position.set(Math.cos(angle) * 0.195, 0.775, Math.sin(angle) * 0.195);
      merlon.rotation.y = -angle;
      group.add(merlon);
    }
  } else if (type === 'n') {
    group.add(enableShadows(new THREE.Mesh(geos.knightBase, bodyMat)));
    const collar = enableShadows(new THREE.Mesh(geos.knightCollar, accentMat));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.31;
    group.add(collar);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.3;
    const headMesh = enableShadows(new THREE.Mesh(geos.knightHead, bodyMat));
    headGroup.add(headMesh);

    // Two ears + subtle bridle accent ring
    const earL = enableShadows(new THREE.Mesh(geos.knightEar, accentMat));
    earL.position.set(-0.045, 0.59, 0.04);
    earL.rotation.z = 0.2;
    headGroup.add(earL);

    const earR = enableShadows(new THREE.Mesh(geos.knightEar, accentMat));
    earR.position.set(-0.045, 0.59, -0.04);
    earR.rotation.z = 0.2;
    headGroup.add(earR);

    // Rotate horse to face opponent along -Z (for White) or +Z (for Black)
    headGroup.rotation.y = color === 'w' ? -Math.PI / 2 : Math.PI / 2;
    group.add(headGroup);
  } else if (type === 'b') {
    group.add(enableShadows(new THREE.Mesh(geos.bishopBody, bodyMat)));
    const collar = enableShadows(new THREE.Mesh(geos.bishopCollar, accentMat));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.54;
    group.add(collar);
    const band = enableShadows(new THREE.Mesh(geos.bishopBand, accentMat));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.72;
    group.add(band);
    const finial = enableShadows(new THREE.Mesh(geos.bishopFinial, accentMat));
    finial.position.y = 0.96;
    group.add(finial);
  } else if (type === 'q') {
    group.add(enableShadows(new THREE.Mesh(geos.queenBody, bodyMat)));
    const collar = enableShadows(new THREE.Mesh(geos.queenCollar, accentMat));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.65;
    group.add(collar);
    const orb = enableShadows(new THREE.Mesh(geos.queenOrb, accentMat));
    orb.position.y = 1.02;
    group.add(orb);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spike = enableShadows(new THREE.Mesh(geos.queenSpike, bodyMat));
      spike.position.set(Math.cos(angle) * 0.185, 1.03, Math.sin(angle) * 0.185);
      spike.rotation.z = -Math.cos(angle) * 0.22;
      spike.rotation.x = Math.sin(angle) * 0.22;
      group.add(spike);

      const tip = enableShadows(new THREE.Mesh(geos.queenCrownTip, accentMat));
      tip.position.set(Math.cos(angle) * 0.2, 1.09, Math.sin(angle) * 0.2);
      group.add(tip);
    }
  } else if (type === 'k') {
    group.add(enableShadows(new THREE.Mesh(geos.kingBody, bodyMat)));
    const collar = enableShadows(new THREE.Mesh(geos.kingCollar, accentMat));
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.72;
    group.add(collar);
    const crownRing = enableShadows(new THREE.Mesh(geos.kingCrownRing, accentMat));
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 1.04;
    group.add(crownRing);
    const cross = enableShadows(new THREE.Mesh(geos.kingCross, accentMat));
    cross.position.y = 1.15;
    group.add(cross);
  }

  return group;
}
