import React from "react";

export const MJЕСЕCI = ["sij", "velj", "ožu", "tra", "svi", "lip", "srp", "kol", "ruj", "lis", "stu", "pro"];

export default function DatumBox({ iso, style }) {
  const d = new Date(iso);
  const prosao = d < new Date();
  return (
    <div className={`rok-datum${prosao ? " rok-prosao" : ""}`} style={style}>
      <div className="dan">{d.getDate()}</div>
      <div className="mj">{MJЕСЕCI[d.getMonth()]} '{String(d.getFullYear()).slice(-2)}</div>
    </div>
  );
}
