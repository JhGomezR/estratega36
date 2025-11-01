"use client"
import React, { useState, useEffect } from 'react';
import type { User, Voter } from '@/lib/types';
import { ResponsiveTree, type TreeSvgProps, type ComputedNode } from '@nivo/tree';

interface TreeNode {
    id: string;
    name: string;
    children?: TreeNode[];
    color?: string;
}

export const buildTreeData = (users: User[], voters: Voter[]): TreeNode => {
    const root: TreeNode = {
        id: "EstrategaCRM",
        name: "EstrategaCRM",
        children: [],
    };

    if (!users || users.length === 0) {
        return root;
    }

    const voterCounts = new Map<string, number>();
    voters.forEach(voter => {
        voterCounts.set(voter.promoterId, (voterCounts.get(voter.promoterId) || 0) + 1);
    });

    const userMap = new Map<string, TreeNode>();

    // First pass: create a node for each user
    users.forEach(user => {
        const totalVoters = voterCounts.get(user.id) || 0;
        const name = `${user.firstName} ${user.lastName}`;
        userMap.set(user.id, {
            id: user.id,
            name: `${name} (${totalVoters} votantes)`,
            children: [],
        });
    });

    // Second pass: build the hierarchy
    users.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;

        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
            parentNode?.children?.push(userNode);
        } else {
            // If no parent or parent not found, add to root
            root.children?.push(userNode);
        }
    });

    return root;
};


export const NetworkTree = ({ data }: { data: TreeNode }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null;
    }
    
    if (!data.children || data.children.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-center pt-10">No hay datos de red para mostrar.</p></div>
    }

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <ResponsiveTree
                data={data}
                identity="id"
                nodeSize={30}
                margin={{ top: 40, right: 120, bottom: 40, left: 120 }}
                layout="vertical"
                label={d => d.name}
                labelPosition="right"
                labelOffset={10}
                theme={{
                    tooltip: {
                        container: {
                            background: 'hsl(var(--background))',
                            color: 'hsl(var(--foreground))',
                            border: '1px solid hsl(var(--border))',
                        },
                    },
                    labels: {
                        text: {
                            fill: 'hsl(var(--foreground))',
                            fontSize: 12,
                        }
                    }
                }}
                motionConfig="wobbly"
                linkThickness={2}
            />
        </div>
    );
};
