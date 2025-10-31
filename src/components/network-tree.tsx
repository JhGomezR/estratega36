"use client"
import React from 'react';
import type { User, Voter } from '@/lib/types';
import { ResponsiveTreeMap, type ComputedNode } from '@nivo/treemap';

interface TreeNode {
    id: string;
    value?: number;
    children?: TreeNode[];
    name: string;
    color?: string;
}

export const buildTreeData = (users: User[], voters: Voter[]): TreeNode => {
    const root: TreeNode = {
        id: "EstrategaCRM",
        name: "EstrategaCRM",
        children: [],
    };

    if (users.length === 0) {
        return root;
    }

    const voterCounts = new Map<string, number>();
    voters.forEach(voter => {
        voterCounts.set(voter.promoterId, (voterCounts.get(voter.promoterId) || 0) + 1);
    });

    const userNodes = new Map<string, TreeNode>();
    const rootChildren: TreeNode[] = [];

    // 1. Create a node for each user
    users.forEach(user => {
        const totalVoters = voterCounts.get(user.id) || 0;
        const name = `${user.firstName} ${user.lastName}`;
        userNodes.set(user.id, {
            id: user.id,
            name: `${name} (${totalVoters} votantes)`,
            value: totalVoters > 0 ? totalVoters : 1, // Treemap needs a value
            children: [],
        });
    });

    // 2. Link nodes to their parents or to the root.
    userNodes.forEach(node => {
        const user = users.find(u => u.id === node.id);
        const parentId = user?.parentId;
        
        if (parentId && userNodes.has(parentId)) {
            const parentNode = userNodes.get(parentId)!;
            if (!parentNode.children) {
                parentNode.children = [];
            }
            parentNode.children.push(node);
        } else {
            rootChildren.push(node);
        }
    });

    root.children = rootChildren;

    return root;
};

const CustomNode = ({ node }: { node: ComputedNode<TreeNode> }) => {
    // Only show labels for nodes that are large enough
    if (node.width < 60 || node.height < 30) {
        return null;
    }
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: node.width,
                height: node.height,
                background: node.color,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${node.borderColor}`,
                color: 'white',
                boxSizing: 'border-box'
            }}
        >
            <div className="p-1 text-center text-xs font-semibold overflow-hidden text-ellipsis">
                {node.data.name}
            </div>
        </div>
    );
};


export const NetworkTree = ({ data }: { data: TreeNode }) => {
    if (!data.children || data.children.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-center pt-10">No hay datos de red para mostrar.</p></div>
    }

    return (
        <ResponsiveTreeMap
            data={data}
            identity="id"
            value="value"
            nodeComponent={CustomNode}
            colors={{ scheme: 'nivo' }}
            labelSkipSize={12}
            parentLabelPosition="left"
            parentLabelTextColor={{
                from: 'color',
                modifiers: [
                    [ 'darker', 2 ]
                ]
            }}
            borderColor={{
                from: 'color',
                modifiers: [
                    [ 'darker', 0.1 ]
                ]
            }}
            theme={{
                tooltip: {
                    container: {
                        background: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        border: '1px solid hsl(var(--border))',
                    },
                },
            }}
        />
    );
};

