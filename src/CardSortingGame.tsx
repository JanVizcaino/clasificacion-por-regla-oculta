import React, { useState, useEffect } from 'react';

type Color = 'red' | 'blue' | 'green' | 'yellow';
type Shape = 'circle' | 'square' | 'triangle' | 'star';
type Size = 'small' | 'medium' | 'large';
type Rule = 'color' | 'shape' | 'number' | 'size';

interface Card {
  id: number;
  color: Color;
  shape: Shape;
  number: number;
  size: Size;
}

interface GameStats {
  attempts: number;
  correct: number;
  perseverativeErrors: number;
  ruleChanges: number;
  streak: number;
}

const CardSortingGame: React.FC = () => {
  const CARDS_TO_CHANGE_RULE = 5;

  const [currentRule, setCurrentRule] = useState<Rule>('color');
  const [previousRule, setPreviousRule] = useState<Rule | null>(null);
  
  const [targetCard, setTargetCard] = useState<Card | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [stats, setStats] = useState<GameStats>({
    attempts: 0,
    correct: 0,
    perseverativeErrors: 0,
    ruleChanges: 0,
    streak: 0,
  });

  const referenceCards: Card[] = [
    { id: 1, color: 'red', shape: 'circle', number: 1, size: 'small' },
    { id: 2, color: 'green', shape: 'triangle', number: 2, size: 'medium' },
    { id: 3, color: 'blue', shape: 'star', number: 3, size: 'large' },
    { id: 4, color: 'yellow', shape: 'square', number: 4, size: 'medium' },
  ];

  
  const checkMatch = (c1: Card, c2: Card, rule: Rule): boolean => {
    return c1[rule] === c2[rule];
  };

  const generateNewCard = () => {
    const colors: Color[] = ['red', 'blue', 'green', 'yellow'];
    const shapes: Shape[] = ['circle', 'square', 'triangle', 'star'];
    const sizes: Size[] = ['small', 'medium', 'large'];
    
    setTargetCard({
      id: Date.now(),
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      number: Math.floor(Math.random() * 4) + 1,
      size: sizes[Math.floor(Math.random() * sizes.length)],
    });
  };

  const changeRule = () => {
    const rules: Rule[] = ['color', 'shape', 'number', 'size'];
    const availableRules = rules.filter(r => r !== currentRule);
    const newRule = availableRules[Math.floor(Math.random() * availableRules.length)];
    
    setPreviousRule(currentRule);
    setCurrentRule(newRule);
    setStats(prev => ({ ...prev, ruleChanges: prev.ruleChanges + 1, streak: 0 }));
    
    console.log("¡La regla ha cambiado internamente a: " + newRule); 
  };


  const handleCardClick = (refCard: Card) => {
    if (!targetCard || feedback) return;

    const isMatch = checkMatch(targetCard, refCard, currentRule);

    const isPerseverative = !isMatch && previousRule && checkMatch(targetCard, refCard, previousRule);

    setFeedback(isMatch ? 'correct' : 'incorrect');

    setStats(prev => ({
      attempts: prev.attempts + 1,
      correct: prev.correct + (isMatch ? 1 : 0),
      streak: isMatch ? prev.streak + 1 : 0,
      ruleChanges: prev.ruleChanges,
      perseverativeErrors: prev.perseverativeErrors + (isPerseverative ? 1 : 0)
    }));

    setTimeout(() => {
      setFeedback(null);
      generateNewCard();
    }, 1000);
  };

  
  useEffect(() => {
    generateNewCard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stats.streak > 0 && stats.streak % CARDS_TO_CHANGE_RULE === 0) {
      changeRule();
    }
  }, [stats.streak]);


  const renderShape = (card: Card) => {
    const scale = card.size === 'small' ? 'scale-75' : card.size === 'large' ? 'scale-125' : 'scale-100';
    
    const colorMap = {
      red: 'text-red-500',
      blue: 'text-blue-500',
      green: 'text-emerald-500',
      yellow: 'text-yellow-500',
    };

    const shapeMap = {
      circle: '●',
      square: '■',
      triangle: '▲',
      star: '★',
    };

    const symbols = Array(card.number).fill(shapeMap[card.shape]);

    return (
      <div className={`flex gap-1 flex-wrap justify-center ${colorMap[card.color]} ${scale} transition-transform duration-300`}>
        {symbols.map((s, i) => (
          <span key={i} className="text-4xl drop-shadow-sm">{s}</span>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-4xl flex justify-between items-start mb-8 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Test de Clasificación</h1>
          <p className="text-sm text-slate-500">Descubre la regla oculta. Cambia sin aviso.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div className="text-slate-500">Intentos: <span className="font-mono font-bold text-slate-800">{stats.attempts}</span></div>
          <div className="text-slate-500">Aciertos: <span className="font-mono font-bold text-green-600">{stats.correct}</span></div>
          <div className="text-slate-500">Cambios Regla: <span className="font-mono font-bold text-purple-600">{stats.ruleChanges}</span></div>
          <div className="text-slate-500" title="Insistir en la regla vieja">Err. Perseverativos: <span className="font-mono font-bold text-red-600">{stats.perseverativeErrors}</span></div>
        </div>
      </div>

      <div className="relative w-full max-w-3xl flex flex-col items-center gap-12">
        
        <div className="relative">
          <div className="text-xs text-center mb-2 text-slate-400 uppercase tracking-wider">Carta a Clasificar</div>
          {targetCard && (
            <div className="w-40 h-56 bg-white rounded-xl border-2 border-slate-300 shadow-xl flex items-center justify-center p-4">
              {renderShape(targetCard)}
            </div>
          )}
          
          {feedback && (
            <div className={`absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/50 z-10 animate-in fade-in zoom-in duration-200`}>
              <span className={`text-2xl font-black px-4 py-2 rounded shadow-lg ${feedback === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {feedback === 'correct' ? '¡CORRECTO!' : 'INCORRECTO'}
              </span>
            </div>
          )}
        </div>

        <div className="w-full">
          <div className="text-xs text-center mb-2 text-slate-400 uppercase tracking-wider">Selecciona una categoría</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {referenceCards.map((refCard) => (
              <button
                key={refCard.id}
                onClick={() => handleCardClick(refCard)}
                disabled={feedback !== null}
                className="w-full h-48 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renderShape(refCard)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 text-xs text-slate-300 font-mono">
        Regla Actual (Solo Dev): {currentRule}
      </div>

    </div>
  );
};

export default CardSortingGame;