import React, { useState } from 'react';
import { ApothecaryItem, CategoryType } from '../engine/relationEngine';
import { groupCatalogByCategory } from '../utils/apothecaryGroups';
import { Item3DThumbnail, handleDragStart } from './LeftDrawer';

interface ElementRailProps {
  catalog: ApothecaryItem[];
  onSelectItem?: (item: ApothecaryItem) => void;
  onRightClickItem?: (item: ApothecaryItem) => void;
}

/**
 * The Element rail: a slim, always-there column down the left of the workspace (about an
 * inch wide) for scrolling through the Element library. Each Element drags into the 3D
 * workspace exactly as it does from the Apothecary Cabinet; a click picks it and a right-click
 * inspects it. The Type menu at the top shows one kind of Element, or All. Searching and
 * making new Elements stay in the Cabinet.
 */
const RailItem: React.FC<{
  item: ApothecaryItem;
  onSelect?: (item: ApothecaryItem) => void;
  onRightClick?: (item: ApothecaryItem) => void;
}> = ({ item, onSelect, onRightClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <li>
      <button
        type="button"
        draggable={true}
        onDragStart={(e) => handleDragStart(e, item)}
        onClick={() => onSelect?.(item)}
        onContextMenu={(e) => {
          e.preventDefault();
          onRightClick?.(item);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        title={`${item.name}: drag into the workspace`}
        aria-label={`${item.name}, ${item.category}`}
        className="w-full flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-cyan-500/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-400 cursor-grab active:cursor-grabbing"
      >
        <Item3DThumbnail item={item} active={hovered} className="w-16 h-16" />
        <span className="w-full text-[8px] leading-tight font-mono text-slate-300 text-center line-clamp-2 break-words">{item.name}</span>
      </button>
    </li>
  );
};

/** 'Orbs' -> 'Orb', for the Type menu. */
const singular = (category: CategoryType) => category.replace(/s$/, '');

export const ElementRail: React.FC<ElementRailProps> = ({ catalog, onSelectItem, onRightClickItem }) => {
  const [type, setType] = useState<CategoryType | 'ALL'>('ALL');
  const groups = groupCatalogByCategory(catalog);
  const shown = type === 'ALL' ? groups : groups.filter((group) => group.category === type);
  return (
    <nav
      aria-label="Element library"
      className="fixed left-0 top-16 bottom-20 z-10 w-[1in] flex flex-col panel-glass border-r border-cyan-500/20"
    >
      <div className="px-1 py-1.5 border-b border-cyan-500/20 space-y-1">
        <h2 className="text-center font-orbitron text-[9px] font-bold tracking-widest text-cyan-300 uppercase">Elements</h2>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CategoryType | 'ALL')}
          aria-label="Element type"
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-md px-0.5 py-1 text-[9px] font-mono text-slate-200 focus:outline-none focus:border-cyan-400/60"
        >
          <option value="ALL">All</option>
          {groups.map(({ category }) => (
            <option key={category} value={category}>{singular(category)}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-2 space-y-3">
        {shown.map(({ category, items }) => (
          <section key={category} aria-label={category}>
            <h3 className="mb-1 text-center text-[8px] font-mono uppercase tracking-wider text-slate-500">{category}</h3>
            <ul className="space-y-1">
              {items.map((item) => (
                <RailItem key={item.id} item={item} onSelect={onSelectItem} onRightClick={onRightClickItem} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
};
