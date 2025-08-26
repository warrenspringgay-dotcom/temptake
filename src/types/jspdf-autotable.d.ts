// src/types/jspdf-autotable.d.ts
declare module "jspdf-autotable" {
  export interface AutoTableHeadBody {
    head?: (string | number)[][];
    body?: (string | number)[][];
    theme?: "plain" | "grid" | "striped";
    startY?: number;
    margin?: { top?: number };
    styles?: { fontSize?: number; cellPadding?: number; fontStyle?: "bold" | "normal" };
    headStyles?: { fillColor?: [number, number, number] };
  }
  const autotable: unknown;
  export default autotable;
}

declare module "jspdf" {
  interface jsPDF {
    autoTable: (opts: import("jspdf-autotable").AutoTableHeadBody) => void;
    lastAutoTable?: { finalY: number };
  }
}
