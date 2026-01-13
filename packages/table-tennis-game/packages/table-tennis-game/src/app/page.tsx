'use client';

import { useEffect, useRef, useState } from 'react';

type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

interface Ball {
  x: number;
  y: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  id: number;
}

export default function TableTennisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const gameRef = useRef({
    player: { x: 50, y: 200, width: 15, height: 80, speed: 8 } as Paddle,
    ai: { x: 735, y: 200, width: 15, height: 80, speed: 6 } as Paddle,
    balls: [
      { x: 400, y: 200, radius: 8, velocityX: 5, velocityY: -3, speed: 5, id: 1 } as Ball,
      { x: 400, y: 300, radius: 8, velocityX: 5, velocityY: 3, speed: 5, id: 2 } as Ball,
    ],
    keys: { up: false, down: false },
    serveTurn: 'player' as 'player' | 'ai',
    serveCount: 0,
    rallyHits: 0,
    touchStartY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = gameRef.current;

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') game.keys.up = true;
      if (e.key === 'ArrowDown') game.keys.down = true;
      if (e.key === ' ' && gameState === 'playing') {
        setGameState('paused');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') game.keys.up = false;
      if (e.key === 'ArrowDown') game.keys.down = false;
    };

    // Touch controls
    const handleTouchStart = (e: TouchEvent) => {
      game.touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - game.touchStartY;
      
      if (deltaY < -10) {
        game.keys.up = true;
        game.keys.down = false;
      } else if (deltaY > 10) {
        game.keys.down = true;
        game.keys.up = false;
      }
      
      game.touchStartY = touchY;
    };

    const handleTouchEnd = () => {
      game.keys.up = false;
      game.keys.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Game loop
    let animationId: number;

    const resetBalls = (scorer: 'player' | 'ai') => {
      game.rallyHits = 0;

      // Determine who serves
      game.serveCount++;
      if (game.serveCount % 2 === 0) {
        game.serveTurn = game.serveTurn === 'player' ? 'ai' : 'player';
      }

      // Reset both balls with different angles
      game.balls[0].x = 400;
      game.balls[0].y = 200;
      game.balls[0].speed = 5;
      game.balls[0].velocityY = -3;
      
      game.balls[1].x = 400;
      game.balls[1].y = 300;
      game.balls[1].speed = 5;
      game.balls[1].velocityY = 3;

      // Serve direction
      if (game.serveTurn === 'player') {
        game.balls[0].velocityX = 5;
        game.balls[1].velocityX = 5;
      } else {
        game.balls[0].velocityX = -5;
        game.balls[1].velocityX = -5;
      }
    };

    const updateGame = () => {
      if (gameState !== 'playing') return;

      // Move player paddle
      if (game.keys.up && game.player.y > 0) {
        game.player.y -= game.player.speed;
      }
      if (game.keys.down && game.player.y < 500 - game.player.height) {
        game.player.y += game.player.speed;
      }

      // AI movement with difficulty - track closest ball
      const aiSpeed = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
      const aiReaction = difficulty === 'easy' ? 0.6 : difficulty === 'medium' ? 0.75 : 0.9;
      const aiError = difficulty === 'easy' ? 40 : difficulty === 'medium' ? 20 : 10;

      // Find closest ball to AI
      const closestBall = game.balls.reduce((closest, ball) => {
        const distToCurrent = Math.abs(ball.x - game.ai.x);
        const distToClosest = Math.abs(closest.x - game.ai.x);
        return distToCurrent < distToClosest ? ball : closest;
      });

      const targetY = closestBall.y - game.ai.height / 2 + (Math.random() - 0.5) * aiError;
      
      if (Math.random() < aiReaction) {
        if (game.ai.y < targetY - 10) {
          game.ai.y += aiSpeed;
        } else if (game.ai.y > targetY + 10) {
          game.ai.y -= aiSpeed;
        }
      }

      // Keep AI paddle in bounds
      if (game.ai.y < 0) game.ai.y = 0;
      if (game.ai.y > 500 - game.ai.height) game.ai.y = 500 - game.ai.height;

      // Move and update all balls
      let anyBallScored = false;
      let scorer: 'player' | 'ai' | null = null;

      game.balls.forEach((ball) => {
        // Move ball
        ball.x += ball.velocityX;
        ball.y += ball.velocityY;

        // Ball collision with top/bottom
        if (ball.y - ball.radius < 0 || ball.y + ball.radius > 500) {
          ball.velocityY = -ball.velocityY;
        }

        // Ball collision with player paddle
        if (
          ball.x - ball.radius < game.player.x + game.player.width &&
          ball.x + ball.radius > game.player.x &&
          ball.y > game.player.y &&
          ball.y < game.player.y + game.player.height
        ) {
          const hitPos = (ball.y - game.player.y) / game.player.height - 0.5;
          ball.velocityY = hitPos * 10;
          ball.velocityX = Math.abs(ball.velocityX);
          game.rallyHits++;
          
          // Increase speed during rallies
          if (game.rallyHits % 4 === 0) {
            ball.speed += 0.5;
            ball.velocityX = (ball.velocityX / Math.abs(ball.velocityX)) * ball.speed;
          }
        }

        // Ball collision with AI paddle
        if (
          ball.x + ball.radius > game.ai.x &&
          ball.x - ball.radius < game.ai.x + game.ai.width &&
          ball.y > game.ai.y &&
          ball.y < game.ai.y + game.ai.height
        ) {
          const hitPos = (ball.y - game.ai.y) / game.ai.height - 0.5;
          ball.velocityY = hitPos * 10;
          ball.velocityX = -Math.abs(ball.velocityX);
          game.rallyHits++;
          
          if (game.rallyHits % 4 === 0) {
            ball.speed += 0.5;
            ball.velocityX = (ball.velocityX / Math.abs(ball.velocityX)) * ball.speed;
          }
        }

        // Scoring - if any ball goes out
        if (ball.x - ball.radius < 0) {
          anyBallScored = true;
          scorer = 'ai';
        }

        if (ball.x + ball.radius > 800) {
          anyBallScored = true;
          scorer = 'player';
        }
      });

      // Update score if any ball scored
      if (anyBallScored && scorer) {
        if (scorer === 'ai') {
          const newScore = aiScore + 1;
          setAiScore(newScore);
          checkWinner(playerScore, newScore);
        } else {
          const newScore = playerScore + 1;
          setPlayerScore(newScore);
          checkWinner(newScore, aiScore);
        }
        resetBalls(scorer);
      }
    };

    const checkWinner = (pScore: number, aScore: number) => {
      if (pScore >= 11 && pScore - aScore >= 2) {
        setWinner('Player');
        setGameState('gameOver');
      } else if (aScore >= 11 && aScore - pScore >= 2) {
        setWinner('AI');
        setGameState('gameOver');
      }
    };

    const drawGame = () => {
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 800, 500);

      // Draw table
      ctx.fillStyle = '#16213e';
      ctx.fillRect(0, 400, 800, 100);

      // Draw net
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(395, 350, 10, 60);

      // Draw center line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 350);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw player paddle
      ctx.fillStyle = '#00d4ff';
      ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);

      // Draw AI paddle
      ctx.fillStyle = '#ff006e';
      ctx.fillRect(game.ai.x, game.ai.y, game.ai.width, game.ai.height);

      // Draw balls with different colors
      game.balls.forEach((ball, index) => {
        ctx.fillStyle = index === 0 ? '#ffbe0b' : '#00ff88';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const gameLoop = () => {
      updateGame();
      drawGame();
      animationId = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      gameLoop();
    } else {
      drawGame();
    }

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, difficulty, playerScore, aiScore]);

  const startGame = () => {
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
    gameRef.current.serveCount = 0;
    gameRef.current.serveTurn = 'player';
    setGameState('playing');
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  const backToMenu = () => {
    setGameState('menu');
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white mb-2">🏓 Table Tennis</h1>
          <p className="text-gray-300">Classic Ping-Pong Game</p>
        </div>

        {/* Scoreboard */}
        {gameState !== 'menu' && (
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 mb-4 flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-cyan-400 text-sm mb-1">PLAYER</div>
              <div className="text-5xl font-bold text-white">{playerScore}</div>
            </div>
            <div className="text-gray-400 text-2xl mx-4">-</div>
            <div className="text-center flex-1">
              <div className="text-pink-400 text-sm mb-1">AI</div>
              <div className="text-5xl font-bold text-white">{aiScore}</div>
            </div>
          </div>
        )}

        {/* Game Canvas */}
        <div className="relative bg-black/50 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="w-full h-auto"
          />

          {/* Menu Overlay */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <h2 className="text-4xl font-bold text-white mb-8">Select Difficulty</h2>
              <div className="space-y-4 mb-8">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all ${
                      difficulty === diff
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={startGame}
                className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-xl hover:scale-105 transition-transform"
              >
                Start Game
              </button>
              <div className="mt-8 text-gray-400 text-sm text-center">
                <p>Use ↑↓ Arrow Keys or Touch to move</p>
                <p className="mt-1">First to 11 points wins (must win by 2)</p>
              </div>
            </div>
          )}

          {/* Paused Overlay */}
          {gameState === 'paused' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <h2 className="text-4xl font-bold text-white mb-8">Paused</h2>
              <div className="space-y-4">
                <button
                  onClick={resumeGame}
                  className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-xl hover:scale-105 transition-transform block w-full"
                >
                  Resume
                </button>
                <button
                  onClick={backToMenu}
                  className="px-12 py-4 bg-gray-700 text-white rounded-lg font-bold text-xl hover:bg-gray-600 transition-colors block w-full"
                >
                  Main Menu
                </button>
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameOver' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <h2 className="text-5xl font-bold text-white mb-4">
                {winner === 'Player' ? '🎉 You Win!' : '😔 AI Wins!'}
              </h2>
              <p className="text-2xl text-gray-300 mb-8">
                Final Score: {playerScore} - {aiScore}
              </p>
              <div className="space-y-4">
                <button
                  onClick={startGame}
                  className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-xl hover:scale-105 transition-transform block w-full"
                >
                  Play Again
                </button>
                <button
                  onClick={backToMenu}
                  className="px-12 py-4 bg-gray-700 text-white rounded-lg font-bold text-xl hover:bg-gray-600 transition-colors block w-full"
                >
                  Main Menu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {gameState === 'playing' && (
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={() => setGameState('paused')}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
            >
              Pause
            </button>
            <button
              onClick={backToMenu}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Quit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}







