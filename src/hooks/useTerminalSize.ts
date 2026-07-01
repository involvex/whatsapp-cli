import { useState, useEffect } from "react";
import { useStdout } from "ink";

export interface TerminalSize {
  rows: number;
  columns: number;
}

const MIN_ROWS = 12;
const MIN_COLUMNS = 40;

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>({
    rows: stdout.rows || 24,
    columns: stdout.columns || 80,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        rows: Math.max(stdout.rows || MIN_ROWS, MIN_ROWS),
        columns: Math.max(stdout.columns || MIN_COLUMNS, MIN_COLUMNS),
      });
    };

    stdout.on("resize", onResize);
    onResize();

    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
}
