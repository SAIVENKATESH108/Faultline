"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

// ─────────────────────────────────────────────────────────────────────────────
// Fractured Crystal Mesh Component
// ─────────────────────────────────────────────────────────────────────────────

// Suppress harmless Three.js r163+ Clock deprecation warning emitted by R3F internal loop
if (typeof window !== "undefined") {
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("THREE.Clock: This module has been deprecated") ||
        args[0].includes("THREE.BufferGeometry.toNonIndexed()"))
    ) {
      return;
    }
    origWarn.apply(console, args);
  };
}

interface FracturedCrystalProps {
  prefersReducedMotion: boolean;
}

function FracturedCrystal({ prefersReducedMotion }: FracturedCrystalProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Split an icosahedron into two offset half-geometries with a visible fracture seam
  const [geoLeft, geoRight] = useMemo(() => {
    const baseRaw = new THREE.IcosahedronGeometry(1.2, 0);
    const base = baseRaw.index ? baseRaw.toNonIndexed() : baseRaw;
    base.computeVertexNormals();

    const posAttr = base.getAttribute("position");
    const normAttr = base.getAttribute("normal");

    const leftPos: number[] = [];
    const leftNorm: number[] = [];
    const rightPos: number[] = [];
    const rightNorm: number[] = [];

    // Split across tilted plane x + 0.25*y = 0
    for (let i = 0; i < posAttr.count; i += 3) {
      const x0 = posAttr.getX(i);
      const y0 = posAttr.getY(i);
      const z0 = posAttr.getZ(i);

      const x1 = posAttr.getX(i + 1);
      const y1 = posAttr.getY(i + 1);
      const z1 = posAttr.getZ(i + 1);

      const x2 = posAttr.getX(i + 2);
      const y2 = posAttr.getY(i + 2);
      const z2 = posAttr.getZ(i + 2);

      const cx = (x0 + x1 + x2) / 3;
      const cy = (y0 + y1 + y2) / 3;
      const splitVal = cx + 0.25 * cy;

      if (splitVal < 0) {
        leftPos.push(x0, y0, z0, x1, y1, z1, x2, y2, z2);
        for (let j = 0; j < 3; j++) {
          leftNorm.push(
            normAttr.getX(i + j),
            normAttr.getY(i + j),
            normAttr.getZ(i + j)
          );
        }
      } else {
        rightPos.push(x0, y0, z0, x1, y1, z1, x2, y2, z2);
        for (let j = 0; j < 3; j++) {
          rightNorm.push(
            normAttr.getX(i + j),
            normAttr.getY(i + j),
            normAttr.getZ(i + j)
          );
        }
      }
    }

    const left = new THREE.BufferGeometry();
    left.setAttribute("position", new THREE.Float32BufferAttribute(leftPos, 3));
    left.setAttribute("normal", new THREE.Float32BufferAttribute(leftNorm, 3));

    const right = new THREE.BufferGeometry();
    right.setAttribute("position", new THREE.Float32BufferAttribute(rightPos, 3));
    right.setAttribute("normal", new THREE.Float32BufferAttribute(rightNorm, 3));

    return [left, right];
  }, []);

  // Shared material: --fracture accent color (#c0392b / #e74c3c) with flatShading
  const fractureMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#e74c3c"), // --fracture-bright
        roughness: 0.35,
        metalness: 0.2,
        flatShading: true,
      }),
    []
  );

  // Inner vein glowing material along the crack
  const crackGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ff6b5a"),
        wireframe: true,
        transparent: true,
        opacity: 0.25,
      }),
    []
  );

  // Clean up Three.js allocations on unmount to prevent WebGL context exhaustion
  useEffect(() => {
    return () => {
      geoLeft.dispose();
      geoRight.dispose();
      fractureMaterial.dispose();
      crackGlowMaterial.dispose();
    };
  }, [geoLeft, geoRight, fractureMaterial, crackGlowMaterial]);

  // Slow continuous Y-axis rotation (~0.15 rad/sec), frozen if prefers-reduced-motion
  useFrame((_, delta) => {
    if (!groupRef.current || prefersReducedMotion) return;
    groupRef.current.rotation.y += delta * 0.15;
    // Subtle breathing tilt
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.0008) * 0.08;
  });

  return (
    <group ref={groupRef}>
      {/* Left fractured half — offset to create gap */}
      <mesh
        geometry={geoLeft}
        material={fractureMaterial}
        position={[-0.045, -0.015, 0.02]}
        rotation={[0.02, 0, 0.04]}
      />

      {/* Right fractured half — offset opposite side */}
      <mesh
        geometry={geoRight}
        material={fractureMaterial}
        position={[0.045, 0.015, -0.02]}
        rotation={[-0.02, 0, -0.04]}
      />

      {/* Subtle interior crack wireframe accent */}
      <mesh
        geometry={geoLeft}
        material={crackGlowMaterial}
        position={[-0.045, -0.015, 0.02]}
        scale={0.98}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroScene Container
// ─────────────────────────────────────────────────────────────────────────────

export interface HeroSceneProps {
  className?: string;
  size?: number;
}

export default function HeroScene({ className = "", size = 42 }: HeroSceneProps) {
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  if (!mounted) {
    // Elegant fallback during SSR to avoid hydration mismatch
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <div
          className="rounded-full bg-[#ef4444]/20 animate-pulse border border-[#ef4444]/30"
          style={{ width: Math.max(16, size * 0.5), height: Math.max(16, size * 0.5) }}
        />
      </div>
    );
  }

  // For compact emblem usage (like Navbar with size <= 48), render a lightweight,
  // hardware-accelerated SVG 3D faceted crystal to prevent WebGL context exhaustion across page transitions.
  if (size <= 48) {
    return (
      <div
        className={`hero-scene-wrapper relative flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
        title="Faultline Fractured Core Emblem"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 hover:scale-105"
        >
          <defs>
            <linearGradient id="facetTop" x1="24" y1="4" x2="12" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f87171" />
              <stop offset="1" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="facetRight" x1="24" y1="4" x2="36" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ef4444" />
              <stop offset="1" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="facetBottomLeft" x1="12" y1="24" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b91c1c" />
              <stop offset="1" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="facetBottomRight" x1="36" y1="24" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#991b1b" />
              <stop offset="1" stopColor="#450a0a" />
            </linearGradient>
            <filter id="coreGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {/* Facets */}
          <polygon points="24,4 12,24 22,23" fill="url(#facetTop)" />
          <polygon points="24,4 26,23 36,24" fill="url(#facetRight)" />
          <polygon points="12,24 22,25 24,44" fill="url(#facetBottomLeft)" />
          <polygon points="36,24 26,25 24,44" fill="url(#facetBottomRight)" />
          {/* Faultline Fracture Seam (Glowing Core) */}
          <path
            d="M24 4L22 23L26 25L24 44"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#coreGlow)"
            className="animate-pulse"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`hero-scene-wrapper relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title="Faultline Fractured Concept Core"
    >
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 45 }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          const dom = gl.domElement;
          dom.addEventListener(
            "webglcontextlost",
            (e) => {
              e.preventDefault();
            },
            false
          );
        }}
      >
        {/* Soft ambient and directional lighting */}
        <ambientLight intensity={1.5} color="#f4f6fc" />
        <directionalLight position={[5, 7, 5]} intensity={1.7} color="#ffffff" />
        <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#dbe2f3" />
        <directionalLight position={[0, -5, 2]} intensity={0.3} color="#fce8e6" />

        {/* Fractured Rock / Crystal */}
        <FracturedCrystal prefersReducedMotion={prefersReducedMotion} />
      </Canvas>
    </div>
  );
}
