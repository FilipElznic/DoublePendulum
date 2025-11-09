# 🎮 Double Pendulum Simulator

A mesmerizing retro-styled physics simulation of a double pendulum system, featuring chaotic motion and beautiful trail patterns.

## ✨ Features

- **Realistic Physics**: Implements the Runge-Kutta 4th order (RK4) numerical integration method for accurate simulation of the double pendulum's equations of motion
- **Retro Aesthetic**: Classic terminal-style interface with neon cyan, magenta, and yellow colors reminiscent of 80s/90s computer graphics
- **Interactive Controls**: Real-time parameter adjustment for masses, lengths, gravity, damping, and simulation speed
- **Visual Trails**: Beautiful colored trails that follow the pendulum masses, creating mesmerizing patterns
- **Chaos Theory Visualization**: Demonstrates the chaotic nature of the double pendulum system

## 🎯 Physics

The double pendulum is a classic example of a chaotic dynamical system. Small changes in initial conditions lead to drastically different outcomes, making long-term prediction impossible. The simulation uses the Lagrangian formulation to derive the equations of motion.

## 🎨 Controls

- **Start/Pause**: Control the animation
- **Reset**: Return to default starting position
- **Random**: Set random initial angles
- **Clear Trail**: Remove the visual trails
- **Sliders**: Adjust masses (m1, m2), lengths (l1, l2), gravity (g), damping, and speed (up to 20x)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🛠️ Tech Stack

- React + Vite
- Pure CSS animations with scanline effects
- Custom physics engine from scratch
- VT323 retro font

## 📝 License

Feel free to use and modify this project for educational purposes.

---

_Experience the beauty of chaos and deterministic unpredictability!_
