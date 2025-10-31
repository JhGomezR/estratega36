"use client"
import React, { useEffect, useState } from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { ResponsiveTree, type TreeDatum } from '@nivo/tree';

interface TreeNode extends TreeDatum {
    id: string;
    voterCount?: number;
    user?: User;
    children?: TreeNode[];
}

export const buildTreeData = (campaigns: Campaign[], users: User[], voters: Voter[]): TreeNode => {
    const root: TreeNode = {
        id: "EstrategaCRM",
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

    // 1. Create a node for each user and add it to the map.
    users.forEach(user => {
        const voterCount = voterCounts.get(user.id) || 0;
        const children: TreeNode[] = [];
        
        // Add a child node representing the voters for this user, if any.
        if (voterCount > 0) {
            children.push({ 
                id: `Votantes de ${user.id}`, // Unique ID for the voter node
                voterCount 
            });
        }
        
        userNodes.set(user.id, {
            id: user.id,
            voterCount: voterCount,
            user,
            children,
        });
    });

    // 2. Link nodes to their parents or to the root.
    userNodes.forEach(node => {
        const parentId = node.user?.parentId;
        
        if (parentId && userNodes.has(parentId)) {
            // This node has a parent, so add it to the parent's children array.
            const parentNode = userNodes.get(parentId)!;
            parentNode.children?.unshift(node); // Add user nodes at the beginning
        } else {
            // This is a top-level node, so add it to the root's children.
            rootChildren.push(node);
        }
    });

    root.children = rootChildren;

    return root;
};


export const NetworkTree = ({ data }: { data: TreeNode }) => {

    if (!data.children || data.children.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-center pt-10">No hay datos de red para mostrar.</p></div>
    }

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <ResponsiveTree
                data={data}
                identity="id"
                nodeSize={30}
                nodeColor={node => node.data.user ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
                linkThickness={2}
                linkColor={{ from: 'source.color', modifiers: [] }}
                theme={{
                    labels: {
                        text: {
                            fill: 'hsl(var(--foreground))',
                            fontSize: 14,
                        }
                    },
                    tooltip: {
                        container: {
                            background: 'hsl(var(--background))',
                            color: 'hsl(var(--foreground))',
                            border: '1px solid hsl(var(--border))',
                        },
                    },
                }}
                label={node => {
                    if (node.data.user) {
                        const userName = `${node.data.user.firstName} ${node.data.user.lastName}`;
                        const totalVoters = node.data.voterCount || 0;
                        return `${userName} (${totalVoters})`;
                    }
                    if (node.id.toString().startsWith('Votantes')) {
                        return `Votantes (${node.data.voterCount || 0})`
                    }
                    return node.id.toString();
                }}
                layout="vertical"
                labelPosition="right"
                labelOffset={10}
                margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
                motionConfig="stiff"
            />
        </div>
    );
};
