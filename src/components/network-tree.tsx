
"use client"
import React from 'react';
import type { User, Voter } from '@/lib/types';
import { ResponsiveTree, type TreeSvgProps, type ComputedNode } from '@nivo/tree';

interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
    value?: number;
}

export const buildTreeData = (users: User[], voters: Voter[]): TreeNode => {
    const root: TreeNode = {
        id: "EstrategaCRM",
        name: "EstrategaCRM",
        children: [],
        value: 0,
    };

    if (!users || users.length === 0) {
        return root;
    }

    const userMap = new Map<string, TreeNode>();

    // First pass: create all user nodes
    users.forEach(user => {
        const voterCount = voters.filter(v => v.promoterId === user.id).length;
        userMap.set(user.id, {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            children: [],
            value: voterCount,
        });
    });

    const topLevelNodes: TreeNode[] = [];

    // Second pass: build the hierarchy
    users.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;

        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
            parentNode?.children?.push(userNode);
        } else {
            topLevelNodes.push(userNode);
        }
    });

    root.children = topLevelNodes;
    
    // Third pass: sum up values from children
    const calculateValue = (node: TreeNode): number => {
        if (!node.children || node.children.length === 0) {
            return node.value || 1; // Assign a minimum value of 1 to leaf nodes
        }
        const childrenValue = node.children.reduce((sum, child) => sum + calculateValue(child), 0);
        node.value = (node.value || 0) + childrenValue;
        return node.value;
    };
    
    calculateValue(root);


    return root;
};

const CustomNode = ({ node }: { node: ComputedNode<TreeNode> }) => {
    return (
        <g transform={`translate(${node.y},${node.x})`}>
            <circle 
                r={15} 
                fill={node.children && node.children.length > 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} 
                stroke="white"
                strokeWidth={2}
            />
            <text
                x={-20}
                y={5}
                textAnchor="end"
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fill: "hsl(var(--foreground))",
                }}
            >
                {node.data.name}
            </text>
             {node.data.value && node.data.value > 0 && (
                <text
                    x={20}
                    y={5}
                    textAnchor="start"
                     style={{
                        fontSize: 10,
                        fontWeight: 400,
                        fill: "hsl(var(--muted-foreground))",
                    }}
                >
                    ({node.data.value} votantes)
                </text>
            )}
        </g>
    );
};


export const NetworkTree = ({ data }: { data: TreeNode }) => {
    if (!data || !data.children || data.children.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay datos de red para mostrar.</p></div>
    }

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <ResponsiveTree
                data={data}
                identity="id"
                nodeSize={30}
                margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
                layout="horizontal"
                nodeComponent={CustomNode}
                linkComponent={({ link }) => (
                    <path
                        d={`M${link.source.y},${link.source.x} L${link.target.y},${link.target.x}`}
                        stroke="hsl(var(--border))"
                        strokeWidth={1}
                        fill="none"
                    />
                )}
                theme={{
                    labels: { text: { fill: 'hsl(var(--foreground))' } },
                    tooltip: {
                        container: {
                            background: 'hsl(var(--background))',
                            color: 'hsl(var(--foreground))',
                            border: '1px solid hsl(var(--border))',
                        },
                    },
                }}
            />
        </div>
    );
};
