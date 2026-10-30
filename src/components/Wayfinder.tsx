import React from 'react';
import { MapPin } from 'lucide-react';

interface WayfinderProps {
  /** Names along the drill-down path, CORE first excluded. */
  path: string[];
  task: string;
  /** Pop the drill-down to this depth (0 = CORE). */
  onNavigate: (depth: number) => void;
}

/**
 * App-level location line: where the user is (CORE > Orb > Satellite >
 * Actuator) and the current task.
 */
export const Wayfinder: React.FC<WayfinderProps> = ({ path, task, onNavigate }) => {
  const crumbClass = 'px-1.5 py-0.5 rounded font-bold tracking-wide whitespace-nowrap';
  return (
    <nav aria-label="Wayfinder" className="flex items-center gap-2 min-w-0 text-[10px]">
      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
      <ol className="flex items-center gap-1 shrink-0 font-orbitron">
        <li>
          <button
            onClick={() => onNavigate(0)}
            disabled={path.length === 0}
            aria-current={path.length === 0 ? 'location' : undefined}
            className={`${crumbClass} ${path.length === 0 ? 'text-cyan-200' : 'text-slate-300 hover:text-cyan-200 hover:bg-slate-800/60'}`}
          >
            CORE
          </button>
        </li>
        {path.map((name, index) => {
          const isCurrent = index === path.length - 1;
          return (
            <React.Fragment key={`${name}-${index}`}>
              <li className="text-cyan-500/60" aria-hidden="true">›</li>
              <li>
                <button
                  onClick={() => onNavigate(index + 1)}
                  disabled={isCurrent}
                  aria-current={isCurrent ? 'location' : undefined}
                  className={`${crumbClass} max-w-[9rem] truncate ${isCurrent ? 'text-cyan-200' : 'text-slate-300 hover:text-cyan-200 hover:bg-slate-800/60'}`}
                >
                  {name}
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
      <span className="w-px h-3.5 bg-slate-800 shrink-0" aria-hidden="true" />
      <p className="text-slate-300 truncate" title={task}>
        <span className="text-slate-500">Now: </span>
        {task}
      </p>
    </nav>
  );
};
