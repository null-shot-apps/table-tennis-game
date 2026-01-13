'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const TABLE_HEIGHT = 20;
const TABLE_Y = CANVAS_HEIGHT - 100;
const NET_WIDTH = 4;
const NET_HEIGHT = 30;
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 10;
const INITIAL_BALL_SPEED = 5;
const SPEED_INCREMENT = 0.1;
const MAX_SPEED = 12;

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { speed: 0.4, errorRate: 0.3, reactionDelay: 15 },
  medium: { speed: 0.65, errorRate: 0.15, reactionDelay: 8 },
  hard: { speed: 0.85, errorRate: 0.05, reactionDelay: 3 },
};

type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
}

interface Paddle {
  x: number;
  y: number;
}

export default function TableTennisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [serveTurn, setServeTurn] = useState<'player' | 'ai'>('player');
  const [totalPoints, setTotalPoints] = useState(0);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);

  // Game objects
  const ballRef = useRef<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    dx: INITIAL_BALL_SPEED,
    dy: 2,
    speed: INITIAL_BALL_SPEED,
  });

  const playerPaddleRef = useRef<Paddle>({
    x: 50,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  });

  const aiPaddleRef = useRef<Paddle>({
    x: CANVAS_WIDTH - 50 - PADDLE_WIDTH,
    y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  });

  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number>();
  const aiErrorRef = useRef(0);
  const rallyCountRef = useRef(0);

  // Touch controls
  const touchStartYRef = useRef<number | null>(null);

  // Reset ball position
  const resetBall = useCallback((server: 'player' | 'ai') => {
    const ball = ballRef.current;
    ball.x = CANVAS_WIDTH / 2;
    ball.y = CANVAS_HEIGHT / 2;
    ball.speed = INITIAL_BALL_SPEED;
    
    const angle = (Math.random() - 0.5) * 0.5;
    if (server === 'player') {
      ball.dx = ball.speed;
      ball.dy = ball.speed * angle;
    } else {
      ball.dx = -ball.speed;
      ball.dy = ball.speed * angle;
    }
    
    rallyCountRef.current = 0;
  }, []);

  // Handle scoring
  const handleScore = useCallback((scorer: 'player' | 'ai') => {
    if (scorer === 'player') {
      setPlayerScore(prev => prev + 1);
    } else {
      setAiScore(prev => prev + 1);
    }

    setTotalPoints(prev => {
      const newTotal = prev + 1;
      // Alternate serve every 2 points
      if (newTotal % 2 === 0) {
        setServeTurn(current => current === 'player' ? 'ai' : 'player');
      }
      return newTotal;
    });
  }, []);

  // Check win condition
  useEffect(() => {
    if (gameState !== 'playing') return;

    const checkWin = () => {
      if (playerScore >= 11 && playerScore - aiScore >= 2) {
        setWinner('player');
        setGameState('gameOver');
      } else if (aiScore >= 11 && aiScore - playerScore >= 2) {
        setWinner('ai');
        setGameState('gameOver');
      }
    };

    checkWin();
  }, [playerScore, aiScore, gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ball = ballRef.current;
    const playerPaddle = playerPaddleRef.current;
    const aiPaddle = aiPaddleRef.current;
    const diffSettings = DIFFICULTY_SETTINGS[difficulty];

    let frameCount = 0;

    const gameLoop = () => {
      frameCount++;

      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw table
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(0, TABLE_Y, CANVAS_WIDTH, TABLE_HEIGHT);

      // Draw net
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(CANVAS_WIDTH / 2 - NET_WIDTH / 2, TABLE_Y - NET_HEIGHT, NET_WIDTH, NET_HEIGHT);

      // Draw center line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, TABLE_Y - NET_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update player paddle
      if (keysRef.current['ArrowUp'] && playerPaddle.y > 0) {
        playerPaddle.y -= 6;
      }
      if (keysRef.current['ArrowDown'] && playerPaddle.y < TABLE_Y - PADDLE_HEIGHT) {
        playerPaddle.y += 6;
      }

      // AI paddle logic
      if (frameCount % diffSettings.reactionDelay === 0) {
        const targetY = ball.y - PADDLE_HEIGHT / 2;
        const aiError = aiErrorRef.current;
        
        if (Math.random() < diffSettings.errorRate) {
          aiErrorRef.current = (Math.random() - 0.5) * 60;
        } else {
          aiErrorRef.current *= 0.95;
        }

        const adjustedTarget = targetY + aiError;
        const diff = adjustedTarget - aiPaddle.y;
        
        if (Math.abs(diff) > 2) {
          aiPaddle.y += Math.sign(diff) * diffSettings.speed * 8;
        }
      }

      // Clamp AI paddle
      aiPaddle.y = Math.max(0, Math.min(TABLE_Y - PADDLE_HEIGHT, aiPaddle.y));

      // Draw paddles
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(playerPaddle.x, playerPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(aiPaddle.x, aiPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Update ball
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Ball collision with top/bottom
      if (ball.y <= 0 || ball.y >= TABLE_Y - BALL_SIZE) {
        ball.dy *= -1;
        ball.y = ball.y <= 0 ? 0 : TABLE_Y - BALL_SIZE;
      }

      // Ball collision with player paddle
      if (
        ball.x <= playerPaddle.x + PADDLE_WIDTH &&
        ball.x + BALL_SIZE >= playerPaddle.x &&
        ball.y + BALL_SIZE >= playerPaddle.y &&
        ball.y <= playerPaddle.y + PADDLE_HEIGHT &&
        ball.dx < 0
      ) {
        const hitPos = (ball.y + BALL_SIZE / 2 - playerPaddle.y) / PADDLE_HEIGHT - 0.5;
        ball.dx = Math.abs(ball.dx);
        ball.dy = hitPos * ball.speed * 1.5;
        ball.speed = Math.min(ball.speed + SPEED_INCREMENT, MAX_SPEED);
        rallyCountRef.current++;
      }

      // Ball collision with AI paddle
      if (
        ball.x + BALL_SIZE >= aiPaddle.x &&
        ball.x <= aiPaddle.x + PADDLE_WIDTH &&
        ball.y + BALL_SIZE >= aiPaddle.y &&
        ball.y <= aiPaddle.y + PADDLE_HEIGHT &&
        ball.dx > 0
      ) {
        const hitPos = (ball.y + BALL_SIZE / 2 - aiPaddle.y) / PADDLE_HEIGHT - 0.5;
        ball.dx = -Math.abs(ball.dx);
        ball.dy = hitPos * ball.speed * 1.5;
        ball.speed = Math.min(ball.speed + SPEED_INCREMENT, MAX_SPEED);
        rallyCountRef.current++;
      }

      // Scoring
      if (ball.x < 0) {
        handleScore('ai');
        resetBall(serveTurn);
      } else if (ball.x > CANVAS_WIDTH) {
        handleScore('player');
        resetBall(serveTurn);
      }

      // Draw ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x + BALL_SIZE / 2, ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, difficulty, handleScore, resetBall, serveTurn]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        keysRef.current[e.key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        keysRef.current[e.key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (touchStartYRef.current === null) return;

      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartYRef.current;
      
      const playerPaddle = playerPaddleRef.current;
      playerPaddle.y += deltaY * 0.5;
      playerPaddle.y = Math.max(0, Math.min(TABLE_Y - PADDLE_HEIGHT, playerPaddle.y));
      
      touchStartYRef.current = touchY;
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = null;
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const startGame = () => {
    setPlayerScore(0);
    setAiScore(0);
    setTotalPoints(0);
    setServeTurn('player');
    setWinner(null);
    resetBall('player');
    setGameState('playing');
  };

  const pauseGame = () => {
    setGameState('paused');
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  const backToMenu = () => {
    setGameState('menu');
    setPlayerScore(0);
    setAiScore(0);
    setTotalPoints(0);
    setWinner(null);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white flex flex-col items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-black to-purple-950 opacity-50" />
      
      <div className="relative z-10 flex flex-col items-center gap-6 p-4">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-2">
          Table Tennis
        </h1>

        {/* Scoreboard */}
        {gameState !== 'menu' && (
          <div className="flex items-center gap-8 text-2xl md:text-3xl font-bold mb-4">
            <div className="flex flex-col items-center">
              <span className="text-green-400">{playerScore}</span>
              <span className="text-xs text-gray-400">YOU</span>
            </div>
            <span className="text-gray-500">-</span>
            <div className="flex flex-col items-center">
              <span className="text-red-400">{aiScore}</span>
              <span className="text-xs text-gray-400">AI</span>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="relative border-4 border-white/20 rounded-lg overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="max-w-full h-auto"
            style={{ display: 'block' }}
          />
          
          {/* Overlays */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6 p-8">
              <h2 className="text-3xl font-bold mb-4">Welcome!</h2>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <label className="text-sm text-gray-300">Select Difficulty:</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                        difficulty === diff
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-xl transition-all"
              >
                Start Game
              </button>

              <div className="text-sm text-gray-400 text-center mt-4">
                <p>Use ↑↓ Arrow Keys or Touch to move</p>
                <p className="mt-1">First to 11 points wins (must win by 2)</p>
              </div>
            </div>
          )}

          {gameState === 'paused' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
              <h2 className="text-3xl font-bold">Paused</h2>
              <div className="flex gap-3">
                <button
                  onClick={resumeGame}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all"
                >
                  Resume
                </button>
                <button
                  onClick={backToMenu}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
                >
                  Menu
                </button>
              </div>
            </div>
          )}

          {gameState === 'gameOver' && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-6">
              <h2 className="text-4xl font-bold">
                {winner === 'player' ? '🎉 You Win!' : '😔 AI Wins!'}
              </h2>
              <div className="text-2xl">
                Final Score: <span className="text-green-400">{playerScore}</span> - <span className="text-red-400">{aiScore}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startGame}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-all"
                >
                  Play Again
                </button>
                <button
                  onClick={backToMenu}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
                >
                  Menu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        {gameState === 'playing' && (
          <div className="flex gap-3">
            <button
              onClick={pauseGame}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition-all"
            >
              Pause
            </button>
            <button
              onClick={backToMenu}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
            >
              Menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

