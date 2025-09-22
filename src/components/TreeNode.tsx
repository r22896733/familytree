import React, { useRef, useEffect } from 'react';
// FIX: Replace monolithic d3 import with specific modules to resolve type errors.
import { HierarchyNode } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { drag, D3DragEvent } from 'd3-drag';
import { Person, Gender } from '../types';
import { MaleIcon, FemaleIcon, OtherGenderIcon, PlusCircleIcon, MinusCircleIcon, UserPlusIcon, HeartIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface TreeNodeProps {
  // FIX: Use HierarchyNode type from d3-hierarchy.
  node: HierarchyNode<Person>;
  onNodeClick: (person: Person) => void;
  onSpouseClick: (spouse: Omit<Person, 'children' | 'spouse'>) => void;
  // FIX: Use HierarchyNode type from d3-hierarchy.
  onToggle: (node: HierarchyNode<Person>) => void;
  onAddRelative: (parent: Person) => void;
  onNodeDrag: (nodeId: string, dx: number, dy: number) => void;
  canEdit?: boolean;
}

const genderIcon = (gender: Gender) => {
  switch (gender) {
    case Gender.Male:
      return <MaleIcon className="w-4 h-4 text-blue-400" />;
    case Gender.Female:
      return <FemaleIcon className="w-4 h-4 text-pink-400" />;
    default:
      return <OtherGenderIcon className="w-4 h-4 text-purple-400" />;
  }
};

const TreeNode: React.FC<TreeNodeProps> = ({ node, onNodeClick, onSpouseClick, onToggle, onAddRelative, onNodeDrag, canEdit }) => {
  const { t } = useLanguage();
  const { data } = node;
  const hasChildren = data.children || data._children;
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragRef.current) return;
    // FIX: Use select from d3-selection.
    const selection = select(dragRef.current);

    // FIX: Use drag from d3-drag.
    const dragHandler = drag<HTMLDivElement, unknown>()
        // FIX: Add explicit type for drag event.
        .on('start', (event: D3DragEvent<HTMLDivElement, unknown, unknown>) => {
            event.sourceEvent.stopPropagation(); // Prevent zoom on drag start
            // FIX: Use select from d3-selection.
            select(dragRef.current).style('cursor', 'grabbing');
        })
        // FIX: Add explicit type for drag event.
        .on('drag', (event: D3DragEvent<HTMLDivElement, unknown, unknown>) => {
            onNodeDrag(data.id, event.dx, event.dy);
        })
        .on('end', () => {
          // FIX: Use select from d3-selection.
          select(dragRef.current).style('cursor', 'grab');
        });

    selection.call(dragHandler);
    
    // Cleanup
    return () => {
        selection.on('.drag', null);
    };

  }, [data.id, onNodeDrag]);


  const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(node);
  };
  
  return (
    <div ref={dragRef} className="relative w-full h-full p-1" style={{ cursor: 'grab' }}>
      <div 
        onClick={() => onNodeClick(data)}
        className="group bg-gray-800 border-2 border-gray-700 rounded-lg shadow-lg flex items-center h-full p-2 transition-all duration-300 hover:border-cyan-500 hover:shadow-cyan-500/20"
      >
        <img
          src={data.photoUrl}
          alt={data.name}
          className="w-20 h-20 rounded-md object-cover border-2 border-gray-600 group-hover:border-cyan-600"
        />
        <div className="ps-3 flex-grow">
          <p className="font-bold text-white text-sm truncate">{data.name}</p>
          <p className="text-xs text-gray-400">
            {data.birthDate.split('-')[0]} - {data.deathDate ? data.deathDate.split('-')[0] : t('treeNode.present')}
          </p>
          <div className="flex items-center mt-1 text-xs text-gray-400">
            {genderIcon(data.gender)}
            <span className="ms-1.5">{t(`gender.${data.gender}`)}</span>
          </div>
        </div>
      </div>
      {data.spouse && (
        <>
            <div 
                onClick={(e) => { e.stopPropagation(); onSpouseClick(data.spouse!); }}
                className="absolute ltr:left-full rtl:right-full top-1/2 -translate-y-1/2 w-24 bg-gray-700 border border-gray-600 rounded-lg p-1.5 shadow-md text-center cursor-pointer transition-all hover:border-cyan-500 hover:shadow-cyan-500/20"
            >
                <img src={data.spouse.photoUrl} alt={data.spouse.name} className="w-8 h-8 rounded-full object-cover mx-auto mb-1 border-2 border-gray-500"/>
                <p className="text-xs font-semibold text-white truncate">{data.spouse.name}</p>
                <p className="text-[10px] text-gray-400">{t('treeNode.spouse')}</p>
            </div>
            <div className="absolute ltr:left-full rtl:right-full top-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 bg-gray-800 p-1 rounded-full z-10">
                <HeartIcon className="w-4 h-4 text-red-500" />
            </div>
        </>
      )}
      <div className="absolute bottom-[-14px] left-1/2 -translate-x-1/2 flex items-center space-x-2 z-10">
        {hasChildren && (
            <button
            onClick={handleToggle}
            className="bg-gray-700 rounded-full w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-cyan-600 hover:text-white transition-colors"
            aria-label={t(data.children ? 'treeNode.collapseBranch' : 'treeNode.expandBranch')}
            >
            {data.children ? <MinusCircleIcon className="w-5 h-5" /> : <PlusCircleIcon className="w-5 h-5" />}
            </button>
        )}
        {canEdit && (
            <button
                onClick={(e) => { e.stopPropagation(); onAddRelative(data); }}
                className="bg-gray-700 rounded-full w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-green-500 hover:text-white transition-colors"
                aria-label={t('treeNode.addRelative', { name: data.name })}
            >
                <UserPlusIcon className="w-5 h-5" />
            </button>
        )}
      </div>
    </div>
  );
};

export default TreeNode;
