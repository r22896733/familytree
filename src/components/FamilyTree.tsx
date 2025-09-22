import React, { useRef, useEffect, useState, useCallback } from 'react';
// FIX: Replace monolithic d3 import with specific modules to resolve type errors.
import { hierarchy, tree, HierarchyNode } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, D3ZoomEvent } from 'd3-zoom';
import { linkVertical } from 'd3-shape';
import { Person } from '../types';
import TreeNode from './TreeNode';

interface FamilyTreeProps {
  data: Person;
  onNodeClick: (person: Person) => void;
  onSpouseClick: (spouse: Omit<Person, 'children' | 'spouse'>) => void;
  onAddRelative: (parent: Person) => void;
  onNodeToggle: (nodeId: string) => void;
  canEdit?: boolean;
}

interface NodePosition {
    x: number;
    y: number;
}

const FamilyTree: React.FC<FamilyTreeProps> = ({ data, onNodeClick, onSpouseClick, onAddRelative, onNodeToggle, canEdit }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  // FIX: Use hierarchy from d3-hierarchy.
  const [treeData, setTreeData] = useState(() => hierarchy(data));
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});

  useEffect(() => {
      // FIX: Use hierarchy from d3-hierarchy.
      const newTreeData = hierarchy(data);
      setTreeData(newTreeData);
      // Reset positions if data fundamentally changes in a way that removes nodes
      setNodePositions(prevPositions => {
        const newPositions: Record<string, NodePosition> = {};
        const allIds = new Set(newTreeData.descendants().map(d => d.data.id));
        for (const id in prevPositions) {
            if (allIds.has(id)) {
                newPositions[id] = prevPositions[id];
            }
        }
        return newPositions;
      });
  }, [data]);


  // FIX: Use HierarchyNode type from d3-hierarchy.
  const handleNodeToggle = useCallback((nodeToToggle: HierarchyNode<Person>) => {
    onNodeToggle(nodeToToggle.data.id);
  }, [onNodeToggle]);

  const handleNodeDrag = useCallback((nodeId: string, dx: number, dy: number) => {
    setNodePositions(prev => ({
        ...prev,
        [nodeId]: {
            x: (prev[nodeId]?.x || 0) + dx,
            y: (prev[nodeId]?.y || 0) + dy,
        }
    }));
  }, []);


  useEffect(() => {
    if (!svgRef.current) return;

    // FIX: Use select from d3-selection.
    const svg = select(svgRef.current);
    const container = svg.select<SVGGElement>('g.container');
    // FIX: Use zoom from d3-zoom.
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      // FIX: Add explicit type for zoom event.
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        // FIX: Explicitly convert zoom transform to string for the `transform` attribute.
        container.attr('transform', `${event.transform}`);
      });
    
    svg.call(zoomBehavior);

    // FIX: Use zoomIdentity from d3-zoom.
    const initialZoom = zoomIdentity.translate(svg.node()!.clientWidth / 2, 100).scale(0.8);
    svg.call(zoomBehavior.transform, initialZoom);
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodeWidth = 220;
  const nodeHeight = 110;

  // FIX: Use tree from d3-hierarchy.
  // Corrected nodeSize to provide ample horizontal spacing ([width, height]) to prevent overlap.
  const treeLayout = tree<Person>().nodeSize([nodeWidth + 160, nodeHeight + 60]);
  const root = treeLayout(treeData);

  const links = root.links();
  const nodes = root.descendants();

  const getPosition = (nodeId: string) => nodePositions[nodeId] || { x: 0, y: 0 };

  return (
    <svg ref={svgRef} width="100%" height="100%" className="cursor-move">
      <g className="container">
        {links.map((link, i) => {
           const sourcePos = getPosition(link.source.data.id);
           const targetPos = getPosition(link.target.data.id);
           return (
            <path
                key={i}
                // FIX: Use linkVertical from d3-shape.
                d={linkVertical()
                .x(d => (d as [number, number])[0])
                .y(d => (d as [number, number])[1])
                ({
                    source: [link.source.x + sourcePos.x, link.source.y + nodeHeight + sourcePos.y],
                    target: [link.target.x + targetPos.x, link.target.y + targetPos.y],
                } as any)
                }
                fill="none"
                stroke="#4a5568"
                strokeWidth="2"
            />
           );
        })}
        {nodes.map((node, i) => {
          const position = getPosition(node.data.id);
          return (
          <foreignObject
            key={node.data.id || i}
            x={node.x - nodeWidth / 2 + position.x}
            y={node.y + position.y}
            width={nodeWidth}
            height={nodeHeight}
            style={{ overflow: 'visible' }}
          >
            <TreeNode 
              node={node} 
              onNodeClick={onNodeClick}
              onSpouseClick={onSpouseClick}
              onToggle={handleNodeToggle}
              onAddRelative={onAddRelative}
              onNodeDrag={handleNodeDrag}
              canEdit={canEdit}
            />
          </foreignObject>
        )})}
      </g>
    </svg>
  );
};

export default FamilyTree;