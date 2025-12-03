// src/Controller.jsx
import React from "react";
import "./controller.css";

export default function Controller({
  onRestart = () => {},
  onToggleMusic = () => {},
  onSolve = () => {},
  onToggleZoom = () => {},
  onFullscreen = () => {},
  onControl = () => {},
  isMusicOn = true,
}) {

  // stop focus on mobile tap
  function noFocus(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div className="controller-wrap" role="region" aria-label="game controls">
      
      <div className="controller-top">
        <button className="btn primary" onClick={onRestart}>Restart</button>
        <button className="btn" onClick={onSolve}>Solve</button>
        <button className="btn" onClick={() => onToggleZoom(true)}>Top</button>
        <button className="btn" onClick={() => onToggleZoom(false)}>3D</button>
        <button className="btn" onClick={onFullscreen}>⤢</button>
        <button className="btn" onClick={onToggleMusic}>
          {isMusicOn ? "Music: On" : "Music: Off"}
        </button>
      </div>

      <div className="touch-control">
        <div className="tc-row">
          <button
            className="tc-btn"
            tabIndex="-1"
            onPointerDown={(e) => { noFocus(e); onControl("ArrowUp", true); }}
            onPointerUp={(e) => { noFocus(e); onControl("ArrowUp", false); }}
          >
            ↑
          </button>
        </div>

        <div className="tc-row">
          <button
            className="tc-btn"
            tabIndex="-1"
            onPointerDown={(e) => { noFocus(e); onControl("ArrowLeft", true); }}
            onPointerUp={(e) => { noFocus(e); onControl("ArrowLeft", false); }}
          >
            ←
          </button>

          <button
            className="tc-btn"
            tabIndex="-1"
            onPointerDown={(e) => { noFocus(e); onControl("ArrowDown", true); }}
            onPointerUp={(e) => { noFocus(e); onControl("ArrowDown", false); }}
          >
            ↓
          </button>

          <button
            className="tc-btn"
            tabIndex="-1"
            onPointerDown={(e) => { noFocus(e); onControl("ArrowRight", true); }}
            onPointerUp={(e) => { noFocus(e); onControl("ArrowRight", false); }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
