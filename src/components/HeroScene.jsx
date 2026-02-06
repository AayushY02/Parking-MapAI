import { useEffect, useRef } from "react";
import * as THREE from "three";

const HeroScene = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 1;
    const height = mount.clientHeight || 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const pointsGeometry = new THREE.BufferGeometry();
    const count = 2200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorA = new THREE.Color("#4e9f3d");
    const colorB = new THREE.Color("#202420");
    const colorC = new THREE.Color("#7aa96a");

    for (let i = 0; i < count; i += 1) {
      const radius = 1.1 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const heightOffset = (Math.random() - 0.5) * 1.1;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = heightOffset;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      const mix = Math.random();
      const color = colorA.clone().lerp(colorB, mix * 0.7).lerp(colorC, Math.random() * 0.35);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: "#4e9f3d",
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });

    const ringA = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.5, 180), ringMaterial);
    ringA.rotation.x = Math.PI / 2.1;
    ringA.rotation.z = Math.PI / 5;

    const ringB = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.1, 200), ringMaterial.clone());
    ringB.material.opacity = 0.08;
    ringB.rotation.x = Math.PI / 2.5;
    ringB.rotation.z = -Math.PI / 6;

    scene.add(ringA, ringB);

    const clock = new THREE.Clock();
    let animationFrame;

    const animate = () => {
      const t = clock.getElapsedTime();
      points.rotation.y = t * 0.18;
      points.rotation.x = t * 0.07;
      ringA.rotation.z = t * 0.25;
      ringB.rotation.z = -t * 0.2;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const nextWidth = mount.clientWidth || 1;
      const nextHeight = mount.clientHeight || 1;
      renderer.setSize(nextWidth, nextHeight);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animationFrame);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      ringA.geometry.dispose();
      ringB.geometry.dispose();
      ringA.material.dispose();
      ringB.material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="hero-canvas" aria-hidden="true" />;
};

export default HeroScene;
