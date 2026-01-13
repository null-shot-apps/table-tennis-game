'use client';

import { useEffect, useRef, useState } from 'react';

type GameState = 'menu' | 'playing' | 'paused' | 'gameOver';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  radius: number;
  color: string;
}

export default function TableTennisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const gameRef = useRef({
    playerY: 0,
    aiY: 0,
    balls: [] as Ball[],
    keys: {} as Record<string, boolean>,
    touchY: null as number | null,
    serveTurn: 'player' as 'player' | 'ai',
    serveCount: 0,
    animationId: null as number | null,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 400;

    const PADDLE_WIDTH = 10;
    const PADDLE_HEIGHT = 80;
    const BALL_RADIUS = 8;
    const TABLE_HEIGHT = 10;
    const NET_HEIGHT = 50;

    // Initialize game
    const initGame = () => {
      gameRef.current.playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
      gameRef.current.aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;
      gameRef.current.balls = [
        {
          x: canvas.width / 2,
          y: canvas.height / 2,
          dx: 4,
          dy: -3,
          speed: 5,
          radius: BALL_RADIUS,
          color: '#FFD700',
        },
        {
          x: canvas.width / 2,
          y: canvas.height / 2,
          dx: -4,
          dy: 3,
          speed: 5,
          radius: BALL_RADIUS,
          color: '#00FF00',
        },
      ];
    };

    const resetBall = (ballIndex: number) => {
      const ball = gameRef.current.balls[ballIndex];
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.speed = 5;

      // Serve direction based on turn
      if (gameRef.current.serveTurn === 'player') {
        ball.dx = 4 + (ballIndex * 2);
        ball.dy = (Math.random() - 0.5) * 4;
      } else {
        ball.dx = -(4 + (ballIndex * 2));
        ball.dy = (Math.random() - 0.5) * 4;
      }
    };

    const playSound = (frequency: number, duration: number) => {
      if (!soundEnabled) return;
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (e) {
        // Audio not supported
      }
    };

    const drawTable = () => {
      // Table surface
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(0, canvas.height - TABLE_HEIGHT - 100, canvas.width, TABLE_HEIGHT);

      // Net
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(canvas.width / 2 - 2, canvas.height - TABLE_HEIGHT - 100 - NET_HEIGHT, 4, NET_HEIGHT);

      // Net top
      ctx.fillRect(canvas.width / 2 - 20, canvas.height - TABLE_HEIGHT - 100 - NET_HEIGHT, 40, 4);
    };

    const drawPaddle = (x: number, y: number) => {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
    };

    const drawBall = (ball: Ball) => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();
    };

    const updatePlayerPaddle = () => {
      const speed = 6;
      if (gameRef.current.keys['ArrowUp'] && gameRef.current.playerY > 0) {
        gameRef.current.playerY -= speed;
      }
      if (gameRef.current.keys['ArrowDown'] && gameRef.current.playerY < canvas.height - PADDLE_HEIGHT) {
        gameRef.current.playerY += speed;
      }

      // Touch control
      if (gameRef.current.touchY !== null) {
        const targetY = gameRef.current.touchY - PADDLE_HEIGHT / 2;
        const diff = targetY - gameRef.current.playerY;
        if (Math.abs(diff) > 2) {
          gameRef.current.playerY += diff * 0.2;
        }
        gameRef.current.playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, gameRef.current.playerY));
      }
    };

    const updateAIPaddle = () => {
      // Find closest ball
      const closestBall = gameRef.current.balls.reduce((closest, ball) => {
        if (ball.dx > 0) { // Ball moving towards AI
          if (!closest || ball.x > closest.x) return ball;
        }
        return closest;
      }, null as Ball | null);

      if (!closestBall) return;

      const aiSpeed = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4.5 : 6;
      const reactionDelay = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 15 : 5;
      const errorMargin = difficulty === 'easy' ? 40 : difficulty === 'medium' ? 20 : 10;

      const targetY = closestBall.y - PADDLE_HEIGHT / 2 + (Math.random() - 0.5) * errorMargin;
      const diff = targetY - gameRef.current.aiY;

      if (Math.abs(diff) > reactionDelay) {
        if (diff > 0 && gameRef.current.aiY < canvas.height - PADDLE_HEIGHT) {
          gameRef.current.aiY += aiSpeed;
        } else if (diff < 0 && gameRef.current.aiY > 0) {
          gameRef.current.aiY -= aiSpeed;
        }
      }
    };

    const updateBall = (ball: Ball, index: number) => {
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Top and bottom collision
      if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.dy *= -1;
        playSound(300, 0.1);
      }

      // Player paddle collision
      if (
        ball.x - ball.radius < 30 + PADDLE_WIDTH &&
        ball.x - ball.radius > 30 &&
        ball.y > gameRef.current.playerY &&
        ball.y < gameRef.current.playerY + PADDLE_HEIGHT
      ) {
        ball.dx = Math.abs(ball.dx);
        const hitPos = (ball.y - (gameRef.current.playerY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        ball.dy = hitPos * 5;
        ball.speed += 0.2;
        playSound(440, 0.1);
      }

      // AI paddle collision
      if (
        ball.x + ball.radius > canvas.width - 30 - PADDLE_WIDTH &&
        ball.x + ball.radius < canvas.width - 30 &&
        ball.y > gameRef.current.aiY &&
        ball.y < gameRef.current.aiY + PADDLE_HEIGHT
      ) {
        ball.dx = -Math.abs(ball.dx);
        const hitPos = (ball.y - (gameRef.current.aiY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        ball.dy = hitPos * 5;
        ball.speed += 0.2;
        playSound(440, 0.1);
      }

      // Scoring
      if (ball.x - ball.radius < 0) {
        setAiScore((prev) => {
          const newScore = prev + 1;
          checkWinner(playerScore, newScore);
          return newScore;
        });
        gameRef.current.serveCount++;
        if (gameRef.current.serveCount % 2 === 0) {
          gameRef.current.serveTurn = gameRef.current.serveTurn === 'player' ? 'ai' : 'player';
        }
        resetBall(index);
        playSound(200, 0.3);
      } else if (ball.x + ball.radius > canvas.width) {
        setPlayerScore((prev) => {
          const newScore = prev + 1;
          checkWinner(newScore, aiScore);
          return newScore;
        });
        gameRef.current.serveCount++;
        if (gameRef.current.serveCount % 2 === 0) {
          gameRef.current.serveTurn = gameRef.current.serveTurn === 'player' ? 'ai' : 'player';
        }
        resetBall(index);
        playSound(600, 0.3);
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

    const gameLoop = () => {
      if (gameState !== 'playing') return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawTable();
      drawPaddle(30, gameRef.current.playerY);
      drawPaddle(canvas.width - 30 - PADDLE_WIDTH, gameRef.current.aiY);

      gameRef.current.balls.forEach((ball, index) => {
        drawBall(ball);
        updateBall(ball, index);
      });

      updatePlayerPaddle();
      updateAIPaddle();

      gameRef.current.animationId = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      initGame();
      gameLoop();
    }

    return () => {
      if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
      }
    };
  }, [mounted, gameState, difficulty, soundEnabled, playerScore, aiScore]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key] = false;
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
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      gameRef.current.touchY = touch.clientY - rect.top;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      gameRef.current.touchY = touch.clientY - rect.top;
    };

    const handleTouchEnd = () => {
      gameRef.current.touchY = null;
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
    setWinner(null);
    gameRef.current.serveCount = 0;
    gameRef.current.serveTurn = 'player';
    setGameState('playing');
  };

  const pauseGame = () => {
    setGameState('paused');
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  const restartGame = () => {
    startGame();
  };

  const endGame = () => {
    setGameState('menu');
    setPlayerScore(0);
    setAiScore(0);
    setWinner(null);
  };

  if (!mounted) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white mb-8">🏓 Table Tennis</h1>

      {/* In-Game UI Controls - Top Left */}
      {gameState === 'playing' && (
        <div className="fixed top-4 left-4 flex flex-col gap-2 z-10">
          <button
            onClick={pauseGame}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold shadow-lg transition"
          >
            ⏸ Pause
          </button>
          <button
            onClick={restartGame}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-lg transition"
          >
            🔄 Restart
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold shadow-lg transition"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={endGame}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-lg transition"
          >
            🛑 End Game
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && gameState === 'playing' && (
        <div className="fixed top-4 left-48 bg-slate-800 p-4 rounded-lg shadow-xl z-20 border-2 border-purple-500">
          <h3 className="text-white font-bold mb-3">Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="text-white text-sm block mb-1">Difficulty:</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-1 rounded bg-slate-700 text-white border border-slate-600"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label className="text-white text-sm">Sound Effects</label>
            </div>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <div className="flex gap-8 mb-4 text-white text-2xl font-bold">
          <div>Player: {playerScore}</div>
          <div>AI: {aiScore}</div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="border-4 border-white rounded-lg shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Table Tennis</h2>
            <div className="mb-6">
              <label className="text-white block mb-2">Select Difficulty:</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="px-4 py-2 rounded bg-slate-700 text-white border border-slate-600"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-xl shadow-lg transition"
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Paused */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Paused</h2>
            <div className="flex gap-4">
              <button
                onClick={resumeGame}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-lg transition"
              >
                Resume
              </button>
              <button
                onClick={endGame}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold shadow-lg transition"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-slate-800 p-8 rounded-lg shadow-2xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Game Over!</h2>
            <p className="text-2xl text-white mb-6">{winner} Wins!</p>
            <p className="text-xl text-white mb-6">
              Final Score: Player {playerScore} - {aiScore} AI
            </p>
            <div className="flex gap-4">
              <button
                onClick={startGame}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold shadow-lg transition"
              >
                Play Again
              </button>
              <button
                onClick={endGame}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold shadow-lg transition"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Info */}
      <div className="mt-4 text-white text-center text-sm">
        <p>Desktop: Use ↑↓ Arrow Keys | Mobile: Swipe or Drag</p>
      </div>
    </div>
  );
}

