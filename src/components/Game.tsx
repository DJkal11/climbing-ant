import { useEffect, useRef, useState } from 'react';
import { useCallback } from 'react';


interface GameState {
  antPosition: {
    x: number;
    y: number;
  };
  thorns: Array<{
    x: number;
    y: number;
    side: 'left' | 'right';
  }>;
  score: number;
  gameOver: boolean;
  isPaused: boolean;
}

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [antTargetX, setAntTargetX] = useState<number>(130);
  const [gameState, setGameState] = useState<GameState>({
    antPosition: { x: 130, y: 400 },
    thorns: [],
    score: 0,
    gameOver: false,
    isPaused: false
  });

  // Game update and render logic
  useEffect(() => {
    let gameUpdateLoop: number;
    let animationFrameId: number;
    let lastUpdateTime = Date.now();

    const updateGame = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastUpdateTime;
      
      if (deltaTime >= 16 && !gameState.isPaused) { // Increased update frequency for smoother movement
        setGameState((prev: GameState): GameState => {
          // Smooth ant movement using interpolation
          const antCurrentX = prev.antPosition.x;
          const antDiff = antTargetX - antCurrentX;
          const antNewX = antCurrentX + (antDiff * 0.2); // Smooth interpolation factor

          // Check the position of the last spawned thorn
          const lastThorn = prev.thorns[prev.thorns.length - 1];
          const minVerticalGap = 80;
          
          const canSpawnThorn = !lastThorn || lastThorn.y > minVerticalGap;
          const newThornSide = lastThorn ? (lastThorn.side === 'left' ? 'right' : 'left') : (Math.random() > 0.5 ? 'left' : 'right');
          
          const currentThorns = [...prev.thorns];
          const thornsWithNew = currentThorns.concat(
            canSpawnThorn && Math.random() < 0.05 
              ? [{ x: newThornSide === 'left' ? 130 : 170, y: -20, side: newThornSide as 'left' | 'right'}] 
              : []
          );

          // Smoother thorn movement
          const thornsWithUpdatedPositions = thornsWithNew.map((thorn) => ({ 
            ...thorn, 
            y: thorn.y + ((8 + Math.floor(prev.score / 5)) * (deltaTime / 50))
          }));

          const removedThorns = thornsWithUpdatedPositions.filter((thorn) => thorn.y >= 500).length;
          const updatedThorns = thornsWithUpdatedPositions.filter((thorn) => thorn.y < 500);

          return {
            ...prev,
            antPosition: { ...prev.antPosition, x: antNewX },
            thorns: updatedThorns,
            score: prev.score + removedThorns
          };
        });
        lastUpdateTime = currentTime;
      }
    };

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderGame(ctx);

      // Check collisions only if not paused
      if (!gameState.isPaused) {
        gameState.thorns.forEach((thorn) => {
          const distance = Math.sqrt(
            Math.pow(thorn.x - gameState.antPosition.x, 2) +
            Math.pow(thorn.y - gameState.antPosition.y, 2)
          );
          if (distance < 20) {
            setGameState(prev => ({ ...prev, gameOver: true }));
          }
        });
      }

      updateGame();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    if (!gameState.gameOver) {
      gameLoop();
    }

    return () => {
      if (gameUpdateLoop) {
        clearTimeout(gameUpdateLoop);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameState.thorns, gameState.antPosition, gameState.gameOver, gameState.isPaused]); // Add isPaused to dependencies

  // Game rendering function
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw background with subtle gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    bgGradient.addColorStop(0, '#e8f5e8');
    bgGradient.addColorStop(1, '#d5ecd5');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw stem with enhanced gradient and texture
    const stemGradient = ctx.createLinearGradient(145, 0, 155, 0);
    stemGradient.addColorStop(0, '#1a4314');
    stemGradient.addColorStop(0.3, '#2d5a27');
    stemGradient.addColorStop(0.7, '#2d5a27');
    stemGradient.addColorStop(1, '#1a4314');

    ctx.beginPath();
    ctx.strokeStyle = stemGradient;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.moveTo(150, 0);
    ctx.lineTo(150, ctx.canvas.height);
    ctx.stroke();

    // Add enhanced stem texture with curved lines
    ctx.strokeStyle = '#1a4314';
    ctx.lineWidth = 1;
    for (let y = 0; y < ctx.canvas.height; y += 30) {
      const offset = Math.sin(y * 0.1) * 3;
      ctx.beginPath();
      ctx.moveTo(146 + offset, y);
      ctx.quadraticCurveTo(150, y + 15, 154 - offset, y + 30);
      ctx.stroke();
    }

    // Draw thorns with enhanced gradient and organic shape
    gameState.thorns.forEach(thorn => {
      const thornGradient = ctx.createLinearGradient(
        150, thorn.y,
        thorn.side === 'left' ? thorn.x - 25 : thorn.x + 25,
        thorn.y
      );
      thornGradient.addColorStop(0, '#2d5a27');
      thornGradient.addColorStop(0.4, '#8b0000');
      thornGradient.addColorStop(1, '#5c0000');

      ctx.fillStyle = thornGradient;
      ctx.beginPath();

      if (thorn.side === 'left') {
        ctx.moveTo(150, thorn.y);
        ctx.bezierCurveTo(
          thorn.x - 10, thorn.y - 8,
          thorn.x - 15, thorn.y - 5,
          thorn.x - 25, thorn.y
        );
        ctx.lineTo(thorn.x - 20, thorn.y + 10);
        ctx.bezierCurveTo(
          thorn.x - 15, thorn.y + 5,
          thorn.x - 5, thorn.y + 3,
          150, thorn.y
        );
      } else {
        ctx.moveTo(150, thorn.y);
        ctx.bezierCurveTo(
          thorn.x + 10, thorn.y - 8,
          thorn.x + 15, thorn.y - 5,
          thorn.x + 25, thorn.y
        );
        ctx.lineTo(thorn.x + 20, thorn.y + 10);
        ctx.bezierCurveTo(
          thorn.x + 15, thorn.y + 5,
          thorn.x + 5, thorn.y + 3,
          150, thorn.y
        );
      }
      ctx.closePath();
      ctx.fill();

      // Add enhanced shadow and glow effects
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Add highlight effect
      const highlightGradient = ctx.createLinearGradient(
        150, thorn.y - 5,
        thorn.side === 'left' ? thorn.x - 25 : thorn.x + 25,
        thorn.y - 5
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = highlightGradient;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw ant with enhanced detail and shading
    // Body shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Body with gradient
    const antGradient = ctx.createRadialGradient(
      gameState.antPosition.x, gameState.antPosition.y, 0,
      gameState.antPosition.x, gameState.antPosition.y, 16
    );
    antGradient.addColorStop(0, '#3a3a3a');
    antGradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = antGradient;
    ctx.beginPath();
    ctx.ellipse(gameState.antPosition.x, gameState.antPosition.y, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head with gradient
    const headGradient = ctx.createRadialGradient(
      gameState.antPosition.x, gameState.antPosition.y - 12, 0,
      gameState.antPosition.x, gameState.antPosition.y - 12, 8
    );
    headGradient.addColorStop(0, '#2a2a2a');
    headGradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.ellipse(
      gameState.antPosition.x,
      gameState.antPosition.y - 12,
      8, 8, 0, 0, Math.PI * 2
    );
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Enhanced legs with animation
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    const legTime = Date.now() * 0.01;
    for (let i = -1; i <= 1; i++) {
      const legOffset = Math.sin(legTime + i) * 2;

      // Left legs with wave motion
      ctx.beginPath();
      ctx.moveTo(gameState.antPosition.x - 2, gameState.antPosition.y + i * 6);
      ctx.quadraticCurveTo(
        gameState.antPosition.x - 8, gameState.antPosition.y + i * 7 + legOffset,
        gameState.antPosition.x - 15, gameState.antPosition.y + i * 8
      );
      ctx.stroke();

      // Right legs with wave motion
      ctx.beginPath();
      ctx.moveTo(gameState.antPosition.x + 2, gameState.antPosition.y + i * 6);
      ctx.quadraticCurveTo(
        gameState.antPosition.x + 8, gameState.antPosition.y + i * 7 + legOffset,
        gameState.antPosition.x + 15, gameState.antPosition.y + i * 8
      );
      ctx.stroke();
    }

    // Enhanced antennae with wave motion
    const antennaOffset = Math.sin(legTime) * 2;
    ctx.beginPath();
    ctx.moveTo(gameState.antPosition.x - 4, gameState.antPosition.y - 14);
    ctx.quadraticCurveTo(
      gameState.antPosition.x - 6, gameState.antPosition.y - 18 + antennaOffset,
      gameState.antPosition.x - 8, gameState.antPosition.y - 22
    );
    ctx.moveTo(gameState.antPosition.x + 4, gameState.antPosition.y - 14);
    ctx.quadraticCurveTo(
      gameState.antPosition.x + 6, gameState.antPosition.y - 18 + antennaOffset,
      gameState.antPosition.x + 8, gameState.antPosition.y - 22
    );
    ctx.stroke();

    // Draw pause overlay when game is paused
    if (gameState.isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
  };

  // No separate gameLoop function needed since it's now handled in the main useEffect

  // Movement control
  // Memoize moveAnt function
  const moveAnt = useCallback((direction: 'left' | 'right') => {
    if (!gameState.gameOver) {
      setAntTargetX(direction === 'left' ? 130 : 170);
    }
  }, [gameState.gameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
        return;
      }

      if (!gameState.isPaused) { // Only allow movement when not paused
        switch (event.key) {
          case 'ArrowLeft':
            moveAnt('left');
            break;
          case 'ArrowRight':
            moveAnt('right');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveAnt, gameState.isPaused]);

  // Update the handleRestart function
  // Keep only this version of handleRestart
    // Single handleRestart function
  const handleRestart = () => {
    setGameState({
      antPosition: { x: 130, y: 400 },
      thorns: [],
      score: 0,
      gameOver: false,
      isPaused: false
    });
    
    // The game loop will automatically restart due to the gameState dependency
  };
  
  return (
    <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e8f3e8' }}>
      <h2 style={{ color: '#2d5a27', fontFamily: '"Segoe UI", Arial, sans-serif' }}>Climbing Ant</h2>
      <canvas
        ref={canvasRef}
        width={300}
        height={500}
        style={{ 
          border: '2px solid #2d5a27',
          backgroundColor: '#f5f9f5',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
        }}
      />
      <div style={{ color: '#2d5a27', fontSize: '18px', marginTop: '10px', fontWeight: 'bold' }}>Score: {gameState.score}</div>
      {gameState.gameOver && (
        <div 
          onClick={handleRestart}
          style={{ 
            cursor: 'pointer', 
            color: '#8b0000', 
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#ffe6e6',
            borderRadius: '4px',
            display: 'inline-block',
            fontWeight: 'bold'
          }}
        >
          Game Over! Click to restart
        </div>
      )}
    </div>
  );
};

export default Game;