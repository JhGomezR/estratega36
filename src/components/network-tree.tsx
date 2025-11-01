"use client"
import React from 'react';
import type { User, Voter } from '@/lib/types';
import { ResponsiveTreeMap, type TreeMapDatum } from '@nivo/treemap';

interface TreeNode extends TreeMapDatum {
    name: string;
    children?: TreeNode[];
    value?: number;
    color?: string;
}

export const buildTreeData = (users: User[], voters: Voter[]): TreeNode => {
    const root: TreeNode = {
        name: "EstrategaCRM",
        children: [],
        color: '#1A237E' // Primary color
    };

    if (!users || users.length === 0) {
        return root;
    }

    const voterCounts = new Map<string, number>();
    voters.forEach(voter => {
        voterCounts.set(voter.promoterId, (voterCounts.get(voter.promoterId) || 0) + 1);
    });

    const userMap = new Map<string, TreeNode>();

    users.forEach(user => {
        const totalVoters = voterCounts.get(user.id) || 0;
        userMap.set(user.id, {
            name: `${user.firstName} ${user.lastName}`,
            children: [],
            // The value is the number of voters this user recruited *directly*
            value: totalVoters,
            color: '#E8EAF6' // Light background
        });
    });

    const topLevelNodes: TreeNode[] = [];
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

    // A function to sum up child values to parent
    const sumChildValues = (node: TreeNode): number => {
        let ownValue = node.value || 0;
        if (node.children && node.children.length > 0) {
            ownValue += node.children.reduce((sum, child) => sum + sumChildValues(child), 0);
        }
        // Assign a minimum value so even users with 0 voters are visible
        node.value = Math.max(ownValue, 1); 
        return node.value;
    };
    
    sumChildValues(root);
    
    return root;
};

const CustomNode = ({ node, ...props }: {node: any, props: any}) => {
    const isRoot = node.depth === 0;
    const isParent = node.children && node.children.length > 0;
    const showLabel = node.width > 80 && node.height > 20;

    return (
        <g transform={`translate(${node.x},${node.y})`}>
            <rect
                width={node.width}
                height={node.height}
                fill={isParent ? 'rgba(0,0,0,0.05)' : node.data.color || '#fff'}
                strokeWidth={2}
                stroke={isRoot ? 'transparent' : 'hsl(var(--background))'}
            />
            {showLabel && !isParent && (
                 <text
                    x={node.width / 2}
                    y={node.height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{
                        fill: 'hsl(var(--foreground))',
                        fontSize: '12px',
                        fontWeight: 600,
                    }}
                >
                    {node.data.name} ({node.data.value})
                </text>
            )}
        </g>
    );
};

export const NetworkTree = ({ data }: { data: TreeNode }) => {
    if (!data.children || data.children.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay datos de red para mostrar.</p></div>
    }

    return (
        <ResponsiveTreeMap
            data={data}
            identity="name"
            value="value"
            valueFormat=".0s"
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            labelSkipSize={12}
            labelTextColor={{
                from: 'color',
                modifiers: [ [ 'darker', 1.2 ] ]
            }}
            parentLabelPosition="left"
            parentLabelTextColor={{
                from: 'color',
                modifiers: [ [ 'darker', 2 ] ]
            }}
            borderColor={{ from: 'color', modifiers: [ [ 'darker', 0.1 ] ] }}
            theme={{
                tooltip: {
                    container: {
                        background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                    },
                },
            }}
            nodeComponent={CustomNode as any}
        />
    );
};
