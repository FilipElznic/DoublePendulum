import { useState, useEffect, useRef } from "react";
import "./DoublePendulum.css";

// --- Constants ---
const ORIGIN_X = 500;
const ORIGIN_Y = 300;
const DT = 0.016; // Physics timestep
const MAX_TRAIL_LENGTH = 500;

// --- Physics Equations ---
const derivatives = (state, params) => {
  const { th1, w1, th2, w2 } = state;
  const { m1, m2, l1, l2, g } = params;

  // Equations of motion for the angular accelerations (alpha1, alpha2)
  // Derived from the Lagrangian formulation.

  const dth = th1 - th2;

  // Denominator for both alpha1 and alpha2
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * dth);

  // Numerator for alpha1
  const num1 =
    -g * (2 * m1 + m2) * Math.sin(th1) -
    m2 * g * Math.sin(th1 - 2 * th2) -
    2 * Math.sin(dth) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(dth));
  const alpha1 = num1 / (l1 * den);

  // Numerator for alpha2
  const num2 =
    2 *
    Math.sin(dth) *
    (w1 * w1 * l1 * (m1 + m2) +
      g * (m1 + m2) * Math.cos(th1) +
      w2 * w2 * l2 * m2 * Math.cos(dth));
  const alpha2 = num2 / (l2 * den);

  // Return the derivatives [d(th1)/dt, d(w1)/dt, d(th2)/dt, d(w2)/dt]
  return { dth1: w1, dw1: alpha1, dth2: w2, dw2: alpha2 };
};

// --- RK4 Integrator ---
const rk4Step = (state, params, dt) => {
  const k1 = derivatives(state, params);

  const k2_state = {
    th1: state.th1 + 0.5 * dt * k1.dth1,
    w1: state.w1 + 0.5 * dt * k1.dw1,
    th2: state.th2 + 0.5 * dt * k1.dth2,
    w2: state.w2 + 0.5 * dt * k1.dw2,
  };
  const k2 = derivatives(k2_state, params);

  const k3_state = {
    th1: state.th1 + 0.5 * dt * k2.dth1,
    w1: state.w1 + 0.5 * dt * k2.dw1,
    th2: state.th2 + 0.5 * dt * k2.dth2,
    w2: state.w2 + 0.5 * dt * k2.dw2,
  };
  const k3 = derivatives(k3_state, params);

  const k4_state = {
    th1: state.th1 + dt * k3.dth1,
    w1: state.w1 + dt * k3.dw1,
    th2: state.th2 + dt * k3.dth2,
    w2: state.w2 + dt * k3.dw2,
  };
  const k4 = derivatives(k4_state, params);

  // New state after one RK4 step
  const newState = {
    th1: state.th1 + (dt / 6) * (k1.dth1 + 2 * k2.dth1 + 2 * k3.dth1 + k4.dth1),
    w1: state.w1 + (dt / 6) * (k1.dw1 + 2 * k2.dw1 + 2 * k3.dw1 + k4.dw1),
    th2: state.th2 + (dt / 6) * (k1.dth2 + 2 * k2.dth2 + 2 * k3.dth2 + k4.dth2),
    w2: state.w2 + (dt / 6) * (k1.dw2 + 2 * k2.dw2 + 2 * k3.dw2 + k4.dw2),
  };

  return newState;
};

// --- Helper Functions ---
const computePositions = (th1, th2, l1, l2) => {
  const x1 = ORIGIN_X + l1 * Math.sin(th1);
  const y1 = ORIGIN_Y + l1 * Math.cos(th1);
  const x2 = x1 + l2 * Math.sin(th2);
  const y2 = y1 + l2 * Math.cos(th2);
  return { x1, y1, x2, y2 };
};

const normalizeAngle = (angle) => {
  return angle % (2 * Math.PI);
};

// --- React Component ---
const DoublePendulum = () => {
  // --- State Management ---
  const [params, setParams] = useState({
    m1: 10,
    m2: 10,
    l1: 150,
    l2: 150,
    g: 9.81,
    damping: 1.0,
    speed: 5.0,
  });

  const simState = useRef({
    th1: Math.PI / 2,
    w1: 0,
    th2: Math.PI / 2,
    w2: 0,
    lastTime: 0,
    accumulator: 0,
  });

  const [positions, setPositions] = useState(() =>
    computePositions(
      simState.current.th1,
      simState.current.th2,
      params.l1,
      params.l2
    )
  );
  const [trail1, setTrail1] = useState([]);
  const [trail2, setTrail2] = useState([]);
  const [isRunning, setIsRunning] = useState(true);
  const animFrameId = useRef(null);

  // --- Animation Loop ---
  useEffect(() => {
    const animate = (timestamp) => {
      if (!isRunning) {
        simState.current.lastTime = 0; // Reset time when paused
        return;
      }

      if (!simState.current.lastTime) {
        simState.current.lastTime = timestamp;
        animFrameId.current = requestAnimationFrame(animate);
        return;
      }

      let deltaTime = (timestamp - simState.current.lastTime) / 1000;
      simState.current.lastTime = timestamp;
      simState.current.accumulator += deltaTime * params.speed;

      // Fixed-step physics updates
      while (simState.current.accumulator >= DT) {
        const currentState = {
          th1: simState.current.th1,
          w1: simState.current.w1,
          th2: simState.current.th2,
          w2: simState.current.w2,
        };

        let newState = rk4Step(currentState, params, DT);

        // Apply damping
        newState.w1 *= params.damping;
        newState.w2 *= params.damping;

        // Update simulation state
        simState.current.th1 = normalizeAngle(newState.th1);
        simState.current.w1 = newState.w1;
        simState.current.th2 = normalizeAngle(newState.th2);
        simState.current.w2 = newState.w2;

        simState.current.accumulator -= DT;
      }

      // Update render state
      const newPositions = computePositions(
        simState.current.th1,
        simState.current.th2,
        params.l1,
        params.l2
      );
      setPositions(newPositions);

      setTrail1((prev) => {
        const newTrail = [...prev, { x: newPositions.x1, y: newPositions.y1 }];
        return newTrail.length > MAX_TRAIL_LENGTH
          ? newTrail.slice(newTrail.length - MAX_TRAIL_LENGTH)
          : newTrail;
      });

      setTrail2((prev) => {
        const newTrail = [...prev, { x: newPositions.x2, y: newPositions.y2 }];
        return newTrail.length > MAX_TRAIL_LENGTH
          ? newTrail.slice(newTrail.length - MAX_TRAIL_LENGTH)
          : newTrail;
      });

      animFrameId.current = requestAnimationFrame(animate);
    };

    animFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isRunning, params]);

  // --- UI Handlers ---
  const handleReset = () => {
    simState.current = {
      th1: Math.PI / 2,
      w1: 0,
      th2: Math.PI / 2,
      w2: 0,
      lastTime: 0,
      accumulator: 0,
    };
    setTrail1([]);
    setTrail2([]);
  };

  const handleRandomize = () => {
    simState.current = {
      th1: Math.random() * 2 * Math.PI,
      w1: 0,
      th2: Math.random() * 2 * Math.PI,
      w2: 0,
      lastTime: 0,
      accumulator: 0,
    };
    setTrail1([]);
    setTrail2([]);
  };

  const handleParamChange = (param, value) => {
    setParams((prev) => ({ ...prev, [param]: parseFloat(value) }));
  };

  // --- Render ---
  return (
    <div className="double-pendulum-container">
      <h1>Double Pendulum Simulation </h1>
      <div className="content-wrapper">
        <div className="controls-panel">
          {/* Animation Controls */}
          <div className="control-section">
            <h3>Animation Controls</h3>
            <div className="button-group">
              <button
                className={isRunning ? "btn btn-stop" : "btn btn-start"}
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? "⏸ Pause" : "▶ Start"}
              </button>
              <button className="btn btn-reset" onClick={handleReset}>
                ↺ Reset
              </button>
              <button className="btn btn-random" onClick={handleRandomize}>
                🎲 Random
              </button>
              <button
                className="btn btn-clear"
                onClick={() => {
                  setTrail1([]);
                  setTrail2([]);
                }}
              >
                🗑 Clear Trail
              </button>
            </div>
          </div>

          {/* Parameters */}
          <div className="control-section">
            <h3>Pendulum Parameters</h3>
            {Object.keys(params).map((key) => {
              const defs = {
                m1: { min: 1, max: 20, step: 0.5, unit: "kg" },
                m2: { min: 1, max: 20, step: 0.5, unit: "kg" },
                l1: { min: 50, max: 250, step: 10, unit: "px" },
                l2: { min: 50, max: 250, step: 10, unit: "px" },
                g: { min: 0, max: 20, step: 0.1, unit: "m/s²" },
                damping: { min: 0.99, max: 1.0, step: 0.0001, unit: "" },
                speed: { min: 0.1, max: 20, step: 0.1, unit: "x" },
              };
              return (
                <div className="param-control" key={key}>
                  <label>
                    {key}:{" "}
                    <span className="value">
                      {params[key]} {defs[key].unit}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={defs[key].min}
                    max={defs[key].max}
                    step={defs[key].step}
                    value={params[key]}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Simulation SVG */}
        <div className="simulation-container">
          <svg width={800} height={600} className="pendulum-svg">
            {/* Trails first, so they are in the background */}
            <polyline
              points={trail1.map((p) => `${p.x},${p.y}`).join(" ")}
              className="trail trail1"
            />
            <polyline
              points={trail2.map((p) => `${p.x},${p.y}`).join(" ")}
              className="trail trail2"
            />

            {/* Rods */}
            <line
              x1={ORIGIN_X}
              y1={ORIGIN_Y}
              x2={positions.x1}
              y2={positions.y1}
              className="rod"
            />
            <line
              x1={positions.x1}
              y1={positions.y1}
              x2={positions.x2}
              y2={positions.y2}
              className="rod"
            />

            {/* Bobs and Origin on top */}
            <circle
              cx={positions.x1}
              cy={positions.y1}
              r={Math.sqrt(params.m1) * 3}
              className="bob"
            />
            <circle
              cx={positions.x2}
              cy={positions.y2}
              r={Math.sqrt(params.m2) * 3}
              className="bob"
            />
            <circle cx={ORIGIN_X} cy={ORIGIN_Y} r="6" className="origin" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoublePendulum;
