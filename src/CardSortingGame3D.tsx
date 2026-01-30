import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const ColorEnum = z.enum(['red', 'blue', 'green', 'yellow']);
const ShapeEnum = z.enum(['circle', 'square', 'triangle', 'star']);
const SizeEnum = z.enum(['small', 'medium', 'large']);

const CardSchema = z.object({
  id: z.string().uuid(),
  color: ColorEnum,
  shape: ShapeEnum,
  number: z.number().int().min(1).max(4),
  size: SizeEnum,
});

type Card = z.infer<typeof CardSchema>;
type Rule = 'color' | 'shape' | 'number' | 'size';

interface GameStats {
  attempts: number;
  correct: number;
  perseverativeErrors: number;
  ruleChanges: number;
  streak: number;
}

const CARDS_TO_CHANGE_RULE = 5;

const CardSortingGame: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clickableObjects = useRef<THREE.Mesh[]>([]);
  
  const gameStateRef = useRef({
    currentRule: 'color' as Rule,
    previousRule: null as Rule | null,
    isAnimating: false
  });

  const [stats, setStats] = useState<GameStats>({
    attempts: 0,
    correct: 0,
    perseverativeErrors: 0,
    ruleChanges: 0,
    streak: 0,
  });
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [targetCard, setTargetCard] = useState<Card | null>(null);

  const referenceCards = useRef<Card[]>([
    { id: uuidv4(), color: 'red', shape: 'circle', number: 1, size: 'small' },
    { id: uuidv4(), color: 'green', shape: 'triangle', number: 2, size: 'medium' },
    { id: uuidv4(), color: 'blue', shape: 'star', number: 3, size: 'large' },
    { id: uuidv4(), color: 'yellow', shape: 'square', number: 4, size: 'medium' },
  ]);

  const generateNewCard = (): Card => {
    const colors = ColorEnum.options;
    const shapes = ShapeEnum.options;
    const sizes = SizeEnum.options;

    return CardSchema.parse({
      id: uuidv4(),
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      number: Math.floor(Math.random() * 4) + 1,
      size: sizes[Math.floor(Math.random() * sizes.length)],
    });
  };

  const checkMatch = (c1: Card, c2: Card, rule: Rule): boolean => {
    return c1[rule] === c2[rule];
  };

  const changeRule = () => {
    const rules: Rule[] = ['color', 'shape', 'number', 'size'];
    const current = gameStateRef.current.currentRule;
    const available = rules.filter(r => r !== current);
    const newRule = available[Math.floor(Math.random() * available.length)];

    gameStateRef.current.previousRule = current;
    gameStateRef.current.currentRule = newRule;
    
    setStats(prev => ({ ...prev, ruleChanges: prev.ruleChanges + 1, streak: 0 }));
    console.log("LOG: Regla cambiada a:", newRule);
  };

  const handleCardSelection = (refCard: Card) => {
    if (!targetCard || gameStateRef.current.isAnimating) return;
    
    console.log("Procesando selección de carta...");
    gameStateRef.current.isAnimating = true;

    const { currentRule, previousRule } = gameStateRef.current;
    
    const isMatch = checkMatch(targetCard, refCard, currentRule);
    const isPerseverative = !isMatch && previousRule && checkMatch(targetCard, refCard, previousRule);

    setFeedback(isMatch ? 'correct' : 'incorrect');

    setStats(prev => {
      const newStreak = isMatch ? prev.streak + 1 : 0;
      if (newStreak > 0 && newStreak % CARDS_TO_CHANGE_RULE === 0) {
        setTimeout(changeRule, 100);
      }
      return {
        attempts: prev.attempts + 1,
        correct: prev.correct + (isMatch ? 1 : 0),
        streak: newStreak,
        ruleChanges: prev.ruleChanges,
        perseverativeErrors: prev.perseverativeErrors + (isPerseverative ? 1 : 0)
      };
    });

    setTimeout(() => {
      setFeedback(null);
      setTargetCard(generateNewCard());
      gameStateRef.current.isAnimating = false;
    }, 1000);
  };

  const getGeometry = (shape: string) => {
    switch (shape) {
      case 'circle': return new THREE.SphereGeometry(0.6, 32, 32);
      case 'square': return new THREE.BoxGeometry(1, 1, 1);
      case 'triangle': return new THREE.ConeGeometry(0.6, 1.2, 4);
      case 'star': return new THREE.IcosahedronGeometry(0.7, 0);
      default: return new THREE.BoxGeometry(1, 1, 1);
    }
  };

  const getColor = (color: string) => {
    const map: Record<string, number> = { red: 0xff4444, blue: 0x4444ff, green: 0x44aa44, yellow: 0xffff44 };
    return map[color] || 0xffffff;
  };

  const getScale = (size: string) => {
    const map: Record<string, number> = { small: 0.7, medium: 1.0, large: 1.3 };
    return map[size] || 1.0;
  };

  useEffect(() => {
    setTargetCard(generateNewCard());

    if (!mountRef.current) return;

    mountRef.current.innerHTML = ''; 

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 13);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      scene.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.rotation.y += 0.005;
          child.rotation.x += 0.002;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if(!mountRef.current || !cameraRef.current || !rendererRef.current) return;
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !targetCard) return;

    clickableObjects.current = [];
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      if (child instanceof THREE.Mesh) {
        scene.remove(child);
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    const tGeo = getGeometry(targetCard.shape);
    const tMat = new THREE.MeshStandardMaterial({ 
      color: getColor(targetCard.color), 
      emissive: getColor(targetCard.color), 
      emissiveIntensity: 0.4 
    });
    const tMesh = new THREE.Mesh(tGeo, tMat);
    const tScale = getScale(targetCard.size);
    tMesh.scale.set(tScale, tScale, tScale);
    tMesh.position.set(0, 3, 0);
    scene.add(tMesh);

    referenceCards.current.forEach((card, index) => {
      const rGeo = getGeometry(card.shape);
      const rMat = new THREE.MeshStandardMaterial({ 
        color: getColor(card.color), 
        roughness: 0.3
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      
      const spacing = 3.5;
      const startX = -5.25;
      rMesh.position.set(startX + (index * spacing), -2.5, 0);
      
      const rScale = getScale(card.size);
      rMesh.scale.set(rScale, rScale, rScale);
      
      rMesh.userData = { isReference: true, cardData: card };
      
      scene.add(rMesh);
      clickableObjects.current.push(rMesh);
    });
  }, [targetCard]);
  
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    console.log("Click detectado en coordenadas pantalla:", event.clientX, event.clientY);

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(clickableObjects.current, false);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      console.log("¡Objeto tocado!", object.userData);
      
      if (object.userData && object.userData.isReference) {
        handleCardSelection(object.userData.cardData);
      }
    } else {
        console.log("Click en el vacío (No tocó ningún objeto 3D)");
    }
  };


  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans select-none">
      <div 
        ref={mountRef} 
        onClick={handleCanvasClick}
        className="absolute inset-0 z-0 block w-full h-full cursor-pointer" 
      />

      <div className="absolute top-0 left-0 w-full p-4 z-10 pointer-events-none">
        <div className="flex flex-col md:flex-row justify-between items-center text-white bg-slate-800/90 p-4 rounded-xl border border-slate-700 shadow-xl max-w-5xl mx-auto pointer-events-auto">
            <div className="mb-4 md:mb-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Wisconsin 3D
                </h1>
                <p className="text-xs text-slate-400">Descubre la regla oculta</p>
            </div>
            
            <div className="flex gap-8">
                <div className="text-center">
                    <div className="text-2xl font-bold">{stats.attempts}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">Total</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-400">{stats.correct}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">Aciertos</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-violet-400">{stats.ruleChanges}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">Cambios</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-rose-400">{stats.perseverativeErrors}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">Pers.</div>
                </div>
            </div>
        </div>
      </div>

      {feedback && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className={`
                text-6xl font-black px-12 py-8 rounded-3xl shadow-2xl backdrop-blur-sm animate-bounce
                ${feedback === 'correct' 
                    ? 'bg-emerald-500/80 text-white border-4 border-emerald-300' 
                    : 'bg-rose-500/80 text-white border-4 border-rose-300'}
            `}>
                {feedback === 'correct' ? '¡CORRECTO!' : 'INCORRECTO'}
            </div>
        </div>
      )}

      <div className="absolute bottom-8 w-full text-center z-10 pointer-events-none">
        <p className="text-slate-400 text-sm font-medium bg-slate-900/50 inline-block px-4 py-2 rounded-full">
          Haz click en una de las 4 figuras de abajo para clasificar la de arriba
        </p>
      </div>
    </div>
  );
};

export default CardSortingGame;