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
  return (
    <div className="controller-wrap" role="region" aria-label="game controls">
      <div className="controller-top">
        <button className="btn primary" onClick={onRestart}>Restart</button>
        <button className="btn" onClick={onSolve}>Solve</button>
        <button className="btn" onClick={() => onToggleZoom(true)}>Top</button>
        <button className="btn" onClick={() => onToggleZoom(false)}>3D</button>
        <button className="btn" onClick={onFullscreen}>⤢</button>
        <button className="btn" onClick={onToggleMusic}>{isMusicOn ? "Music: On" : "Music: Off"}</button>
      </div>

      <div className="touch-control" aria-hidden>
        <div className="tc-row">
          <button className="tc-btn" onPointerDown={() => onControl("ArrowUp", true)} onPointerUp={() => onControl("ArrowUp", false)}>↑</button>
        </div>
        <div className="tc-row">
          <button className="tc-btn" onPointerDown={() => onControl("ArrowLeft", true)} onPointerUp={() => onControl("ArrowLeft", false)}>←</button>
          <button className="tc-btn" onPointerDown={() => onControl("ArrowDown", true)} onPointerUp={() => onControl("ArrowDown", false)}>↓</button>
          <button className="tc-btn" onPointerDown={() => onControl("ArrowRight", true)} onPointerUp={() => onControl("ArrowRight", false)}>→</button>
        </div>
      </div>
    </div>
  );
}
