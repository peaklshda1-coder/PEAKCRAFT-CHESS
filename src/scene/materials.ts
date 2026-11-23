import * as THREE from 'three';
import { BoardTheme } from '../engine/types';
import { ProceduralTextures } from './textures';

export interface ThemeMaterialSet {
  lightSquare: THREE.MeshStandardMaterial;
  darkSquare: THREE.MeshStandardMaterial;
  frameMaterial: THREE.MeshStandardMaterial;
  goldTrim: THREE.MeshStandardMaterial;
  whiteBody: THREE.MeshPhysicalMaterial;
  whiteAccent: THREE.MeshStandardMaterial;
  blackBody: THREE.MeshPhysicalMaterial;
  blackAccent: THREE.MeshStandardMaterial;
  trayBase: THREE.MeshStandardMaterial;
  coordColor: string;
  dispose: () => void;
}

export function createThemeMaterialSet(
  theme: BoardTheme,
  textures: ProceduralTextures
): ThemeMaterialSet {
  const goldTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C89E4C'),
    metalness: 0.75,
    roughness: 0.44,
    envMapIntensity: 0.45,
  });

  if (theme === 'porcelain') {
    // Alabaster Porcelain & Smoked Slate honed matte finish
    const lightSquare = new THREE.MeshStandardMaterial({
      map: textures.porcelainLight,
      roughness: 0.72,
      metalness: 0.0,
      envMapIntensity: 0.18,
    });
    const darkSquare = new THREE.MeshStandardMaterial({
      map: textures.slateMarble,
      roughness: 0.76,
      metalness: 0.0,
      envMapIntensity: 0.18,
    });
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1B2226'),
      roughness: 0.78,
      metalness: 0.05,
      envMapIntensity: 0.2,
    });
    const whiteBody = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#F5F3EC'),
      roughness: 0.28,
      metalness: 0.02,
      clearcoat: 0.24,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.5,
    });
    const whiteAccent = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#C8A252'),
      metalness: 0.8,
      roughness: 0.3,
      envMapIntensity: 0.65,
    });
    const blackBody = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#22282E'),
      roughness: 0.3,
      metalness: 0.08,
      clearcoat: 0.24,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.5,
    });
    const blackAccent = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#D4AA55'),
      metalness: 0.82,
      roughness: 0.28,
      envMapIntensity: 0.65,
    });
    const trayBase = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#161C20'),
      roughness: 0.82,
      metalness: 0.04,
      envMapIntensity: 0.18,
    });

    return {
      lightSquare,
      darkSquare,
      frameMaterial,
      goldTrim,
      whiteBody,
      whiteAccent,
      blackBody,
      blackAccent,
      trayBase,
      coordColor: '#CBD5E1',
      dispose: () => {
        lightSquare.dispose();
        darkSquare.dispose();
        frameMaterial.dispose();
        goldTrim.dispose();
        whiteBody.dispose();
        whiteAccent.dispose();
        blackBody.dispose();
        blackAccent.dispose();
        trayBase.dispose();
      },
    };
  }

  if (theme === 'walnut') {
    const lightSquare = new THREE.MeshStandardMaterial({
      map: textures.boxwood,
      roughness: 0.78,
      metalness: 0.0,
      envMapIntensity: 0.16,
    });
    const darkSquare = new THREE.MeshStandardMaterial({
      map: textures.walnut,
      roughness: 0.8,
      metalness: 0.0,
      envMapIntensity: 0.16,
    });
    const frameMaterial = new THREE.MeshStandardMaterial({
      map: textures.walnut,
      color: new THREE.Color('#473021'),
      roughness: 0.82,
      metalness: 0.02,
      envMapIntensity: 0.18,
    });
    const whiteBody = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#F0DFC1'),
      roughness: 0.32,
      metalness: 0.02,
      clearcoat: 0.2,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.45,
    });
    const whiteAccent = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#B58A3C'),
      metalness: 0.78,
      roughness: 0.32,
      envMapIntensity: 0.6,
    });
    const blackBody = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#342217'),
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.2,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.45,
    });
    const blackAccent = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#D4AA55'),
      metalness: 0.8,
      roughness: 0.3,
      envMapIntensity: 0.6,
    });
    const trayBase = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2B1C12'),
      roughness: 0.85,
      metalness: 0.03,
      envMapIntensity: 0.16,
    });

    return {
      lightSquare,
      darkSquare,
      frameMaterial,
      goldTrim,
      whiteBody,
      whiteAccent,
      blackBody,
      blackAccent,
      trayBase,
      coordColor: '#EBDAC0',
      dispose: () => {
        lightSquare.dispose();
        darkSquare.dispose();
        frameMaterial.dispose();
        goldTrim.dispose();
        whiteBody.dispose();
        whiteAccent.dispose();
        blackBody.dispose();
        blackAccent.dispose();
        trayBase.dispose();
      },
    };
  }

  // Default: PeakCraft Teal & Gold honed matte board
  const lightSquare = new THREE.MeshStandardMaterial({
    map: textures.ivoryMarble,
    roughness: 0.74,
    metalness: 0.0,
    envMapIntensity: 0.18,
  });
  const darkSquare = new THREE.MeshStandardMaterial({
    map: textures.tealMarble,
    roughness: 0.76,
    metalness: 0.0,
    envMapIntensity: 0.18,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({
    map: textures.darkTealWood,
    roughness: 0.8,
    metalness: 0.04,
    envMapIntensity: 0.2,
  });
  const whiteBody = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#F5F0E5'),
    roughness: 0.28,
    metalness: 0.02,
    clearcoat: 0.22,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.5,
  });
  const whiteAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C4973D'),
    metalness: 0.82,
    roughness: 0.28,
    envMapIntensity: 0.65,
  });
  const blackBody = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#202522'),
    roughness: 0.3,
    metalness: 0.08,
    clearcoat: 0.22,
    clearcoatRoughness: 0.32,
    envMapIntensity: 0.5,
  });
  const blackAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D4AA55'),
    metalness: 0.84,
    roughness: 0.28,
    envMapIntensity: 0.65,
  });
  const trayBase = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0B2827'),
    roughness: 0.84,
    metalness: 0.04,
    envMapIntensity: 0.18,
  });

  return {
    lightSquare,
    darkSquare,
    frameMaterial,
    goldTrim,
    whiteBody,
    whiteAccent,
    blackBody,
    blackAccent,
    trayBase,
    coordColor: '#F0D69B',
    dispose: () => {
      lightSquare.dispose();
      darkSquare.dispose();
      frameMaterial.dispose();
      goldTrim.dispose();
      whiteBody.dispose();
      whiteAccent.dispose();
      blackBody.dispose();
      blackAccent.dispose();
      trayBase.dispose();
    },
  };
}
