import { useState, useEffect, useRef } from "react";
import "./DoublePendulum.css";

const DoublePendulum = () => {
  // Constants from Phase 1
  const ORIGIN_X = 400;
  const ORIGIN_Y = 150;
  // Pendulum parameters
  const [params, setParams] = useState({
    m1: 10, // mass of first bob
    m2: 10, // mass of second bob
    l1: 150, // length of first rod
    l2: 150, // length of second rod
    g: 9.81, // gravitational acceleration
    damping: 1.0, // damping factor (1 = no damping, <1 = damping)
  });

  // Fixed time step for physics
  const DT = 0.01;
  // Simulation State (useRef) - High-frequency physics updates without re-renders
  const simState = useRef({
    th1: Math.PI / 2, // Start at 90 degrees
    w1: 0,
    th2: Math.PI / 2 + 0.1, // Slight offset to create initial energy
    w2: 0,
    lastTime: 0,
  });

  // Calculate initial positions
  const getInitialPositions = () => {
    const th1 = Math.PI / 2;
    const th2 = Math.PI / 2 + 0.1;
    const x1 = ORIGIN_X + params.l1 * Math.sin(th1);
    const y1 = ORIGIN_Y + params.l1 * Math.cos(th1);
    const x2 = x1 + params.l2 * Math.sin(th2);
    const y2 = y1 + params.l2 * Math.cos(th2);
    return { x1, y1, x2, y2 };
  };

  // Render State (useState) - Low-frequency visual updates
  const [positions, setPositions] = useState(getInitialPositions());

  // Trail of the second bob
  const [trail, setTrail] = useState([]);
  const maxTrailLength = 500;

  // Animation control
  const [isRunning, setIsRunning] = useState(false);
  const animFrameId = useRef(null);
  const paramsRef = useRef(params);

  // Keep params ref in sync
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // The Animation Loop (useEffect)
  useEffect(() => {
    if (!isRunning) {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      return;
    }

    // RK4 solver inside useEffect to have access to current params
    const rk4Step = (currentState, dt) => {
      const [th1, w1, th2, w2] = currentState;
      const { m1, m2, l1, l2, g, damping } = paramsRef.current;

      // Derivatives function for the double pendulum equations of motion
      const derivatives = (th1, th2, om1, om2) => {
        // For alpha1 (angular acceleration of bob 1)
        const num1 =
          -g * (2 * m1 + m2) * Math.sin(th1) -
          m2 * g * Math.sin(th1 - 2 * th2) -
          2 *
            Math.sin(th1 - th2) *
            m2 *
            (om2 * om2 * l2 + om1 * om1 * l1 * Math.cos(th1 - th2));

        const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * th1 - 2 * th2));
        const alpha1 = num1 / den1;

        // For alpha2 (angular acceleration of bob 2)
        const num2 =
          2 *
          Math.sin(th1 - th2) *
          (om1 * om1 * l1 * (m1 + m2) +
            g * (m1 + m2) * Math.cos(th1) +
            om2 * om2 * l2 * m2 * Math.cos(th1 - th2));

        const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * th1 - 2 * th2));
        const alpha2 = num2 / den2;

        return [om1, alpha1, om2, alpha2];
      };

      // RK4 implementation
      const k1 = derivatives(th1, th2, w1, w2);

      const k2 = derivatives(
        th1 + 0.5 * dt * k1[0],
        th2 + 0.5 * dt * k1[2],
        w1 + 0.5 * dt * k1[1],
        w2 + 0.5 * dt * k1[3]
      );

      const k3 = derivatives(
        th1 + 0.5 * dt * k2[0],
        th2 + 0.5 * dt * k2[2],
        w1 + 0.5 * dt * k2[1],
        w2 + 0.5 * dt * k2[3]
      );

      const k4 = derivatives(
        th1 + dt * k3[0],
        th2 + dt * k3[2],
        w1 + dt * k3[1],
        w2 + dt * k3[3]
      );

      // Calculate new state
      const newTh1 = th1 + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      const newW1 =
        (w1 + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])) * damping;
      const newTh2 = th2 + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      const newW2 =
        (w2 + (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3])) * damping;

      return [newTh1, newW1, newTh2, newW2];
    };

    // Main loop function
    const animate = (timestamp) => {
      // 1. Calculate Time Delta
      if (!simState.current.lastTime) {
        simState.current.lastTime = timestamp;
        animFrameId.current = requestAnimationFrame(animate);
        return;
      }

      let deltaTime = (timestamp - simState.current.lastTime) / 1000; // in seconds
      simState.current.lastTime = timestamp; // 2. Run Fixed-Step Physics Update
      let accumulator = deltaTime;
      let stepCount = 0;

      while (accumulator >= DT) {
        // Get current state
        const currentState = [
          simState.current.th1,
          simState.current.w1,
          simState.current.th2,
          simState.current.w2,
        ];

        // Get new state from RK4 solver
        const newState = rk4Step(currentState, DT);

        // Mutate the ref directly (no re-render)
        simState.current.th1 = newState[0];
        simState.current.w1 = newState[1];
        simState.current.th2 = newState[2];
        simState.current.w2 = newState[3];

        accumulator -= DT;
        stepCount++;
      }

      // Debug logging every 60 frames (~1 second)
      if (Math.random() < 0.016) {
        console.log("Physics state:", {
          th1: simState.current.th1,
          w1: simState.current.w1,
          th2: simState.current.th2,
          w2: simState.current.w2,
          steps: stepCount,
        });
      } // 3. Calculate Render Positions (Cartesian Conversion)
      const { th1, th2 } = simState.current;
      const { l1, l2 } = paramsRef.current;

      const x1 = ORIGIN_X + l1 * Math.sin(th1);
      const y1 = ORIGIN_Y + l1 * Math.cos(th1);
      const x2 = x1 + l2 * Math.sin(th2);
      const y2 = y1 + l2 * Math.cos(th2);

      // Debug positions
      if (Math.random() < 0.016) {
        console.log("Render positions:", { x1, y1, x2, y2 });
      }

      // 4. Update Render State (Triggers ONE re-render)
      setPositions({ x1, y1, x2, y2 });

      // Update trail
      setTrail((prev) => {
        const newTrail = [...prev, { x: x2, y: y2 }];
        if (newTrail.length > maxTrailLength) {
          return newTrail.slice(newTrail.length - maxTrailLength);
        }
        return newTrail;
      });

      // 5. Continue Loop
      animFrameId.current = requestAnimationFrame(animate);
    }; // Start the loop
    console.log("Starting animation loop");
    animFrameId.current = requestAnimationFrame(animate);

    // 6. Cleanup Function
    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isRunning]); // Run when isRunning changes
  // Handler functions
  const handleReset = () => {
    simState.current.th1 = Math.PI / 2;
    simState.current.w1 = 0;
    simState.current.th2 = Math.PI / 2 + 0.1; // Slight offset for initial energy
    simState.current.w2 = 0;
    simState.current.lastTime = 0;
    setTrail([]);
  };

  const handleRandomize = () => {
    simState.current.th1 = Math.random() * Math.PI * 2 - Math.PI;
    simState.current.w1 = 0;
    simState.current.th2 = Math.random() * Math.PI * 2 - Math.PI;
    simState.current.w2 = 0;
    simState.current.lastTime = 0;
    setTrail([]);
  };

  const handleParamChange = (param, value) => {
    setParams((prev) => ({
      ...prev,
      [param]: parseFloat(value),
    }));
  };

  const handleClearTrail = () => {
    setTrail([]);
  };

  return (
    <div className="double-pendulum-container">
      <h1>Double Pendulum Simulation</h1>

      <div className="content-wrapper">
        <div className="controls-panel">
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
              <button className="btn btn-clear" onClick={handleClearTrail}>
                🗑 Clear Trail
              </button>
            </div>
          </div>
          <div className="control-section">
            <h3>Pendulum Parameters</h3>
            <div className="param-control">
              <label>
                Mass 1: <span className="value">{params.m1} kg</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={params.m1}
                onChange={(e) => handleParamChange("m1", e.target.value)}
              />
            </div>
            <div className="param-control">
              <label>
                Mass 2: <span className="value">{params.m2} kg</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={params.m2}
                onChange={(e) => handleParamChange("m2", e.target.value)}
              />
            </div>
            <div className="param-control">
              <label>
                Length 1: <span className="value">{params.l1} px</span>
              </label>
              <input
                type="range"
                min="50"
                max="250"
                step="10"
                value={params.l1}
                onChange={(e) => handleParamChange("l1", e.target.value)}
              />
            </div>
            <div className="param-control">
              <label>
                Length 2: <span className="value">{params.l2} px</span>
              </label>
              <input
                type="range"
                min="50"
                max="250"
                step="10"
                value={params.l2}
                onChange={(e) => handleParamChange("l2", e.target.value)}
              />
            </div>
            <div className="param-control">
              <label>
                Gravity: <span className="value">{params.g} m/s²</span>
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={params.g}
                onChange={(e) => handleParamChange("g", e.target.value)}
              />
            </div>{" "}
            <div className="param-control">
              <label>
                Damping:{" "}
                <span className="value">{params.damping.toFixed(4)}</span>
              </label>
              <input
                type="range"
                min="0.98"
                max="1.0"
                step="0.001"
                value={params.damping}
                onChange={(e) => handleParamChange("damping", e.target.value)}
              />
            </div>
          </div>{" "}
          <div className="control-section">
            <h3>Energy & State</h3>
            <div className="info-display">
              <p>θ₁: {((simState.current.th1 * 180) / Math.PI).toFixed(1)}°</p>
              <p>θ₂: {((simState.current.th2 * 180) / Math.PI).toFixed(1)}°</p>
              <p>ω₁: {simState.current.w1.toFixed(3)} rad/s</p>
              <p>ω₂: {simState.current.w2.toFixed(3)} rad/s</p>
            </div>
          </div>
        </div>

        <div className="simulation-container">
          <svg width={800} height={600} className="pendulum-svg">
            {/* Trail */}
            {trail.length > 1 && (
              <polyline
                points={trail.map((p) => `${p.x},${p.y}`).join(" ")}
                className="trail"
                fill="none"
                stroke="rgba(255, 100, 100, 0.3)"
                strokeWidth="2"
              />
            )}

            {/* Pivot Point (Origin) */}
            <circle
              cx={ORIGIN_X}
              cy={ORIGIN_Y}
              r="6"
              className="origin"
              fill="black"
            />

            {/* Rod 1 */}
            <line
              x1={ORIGIN_X}
              y1={ORIGIN_Y}
              x2={positions.x1}
              y2={positions.y1}
              className="rod"
              stroke="#333"
              strokeWidth="3"
            />

            {/* Bob 1 */}
            <circle
              cx={positions.x1}
              cy={positions.y1}
              r={Math.sqrt(params.m1) * 3}
              className="bob bob1"
              fill="#4A90E2"
              stroke="#2C5F8D"
              strokeWidth="2"
            />

            {/* Rod 2 */}
            <line
              x1={positions.x1}
              y1={positions.y1}
              x2={positions.x2}
              y2={positions.y2}
              className="rod"
              stroke="#555"
              strokeWidth="3"
            />

            {/* Bob 2 */}
            <circle
              cx={positions.x2}
              cy={positions.y2}
              r={Math.sqrt(params.m2) * 3}
              className="bob bob2"
              fill="#E74C3C"
              stroke="#C0392B"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      <div className="info-section">
        <p className="description">
          A double pendulum is a chaotic system where two pendulums are attached
          end-to-end. Small changes in initial conditions lead to vastly
          different outcomes, demonstrating chaos theory.
        </p>
      </div>
    </div>
  );
};

export default DoublePendulum;
