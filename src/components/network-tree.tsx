
"use client"
import React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { Tree, type TreeDatum } from '@nivo/tree';
import { useParentSize } from '@nivo/core';

interface TreeNode extends TreeDatum {
    id: string;
    voterCount?: number;
    user?: User;
    children?: TreeNode[];
}

const buildTreeData = (campaigns: Campaign[], users: User[], voters: Voter[]): TreeNode => {
    const activeCampaigns = campaigns.filter(c => c.status === 'En Campaña');

    const root: TreeNode = {
        id: "EstrategaCRM",
        children: [],
    };

    if (activeCampaigns.length === 0) {
        return { id: "No hay campañas activas", children: [] };
    }

    const userMap = new Map(users.map(u => [u.id, { ...u, children: [] as TreeNode[] }]));
    const voterCounts = new Map<string, number>();

    voters.forEach(voter => {
        voterCounts.set(voter.promoterId, (voterCounts.get(voter.promoterId) || 0) + 1);
    });

    const userNodes = new Map<string, TreeNode>();

    users.forEach(user => {
        const voterCount = voterCounts.get(user.id) || 0;
        const node: TreeNode = {
            id: user.id,
            voterCount: voterCount,
            user: user,
            children: voterCount > 0 ? [{ id: `Votantes de ${user.id}`, voterCount: voterCount }] : undefined
        };
        userNodes.set(user.id, node);
    });

    const topLevelUsers: TreeNode[] = [];
    userNodes.forEach(node => {
        const parentId = node.user?.parentId;
        const parentNode = parentId ? userNodes.get(parentId) : null;

        if (parentNode) {
            if (!parentNode.children) {
                parentNode.children = [];
            }
            // Ensure voters stay as leaf nodes
            const voterChild = parentNode.children.find(c => c.id.startsWith('Votantes de'));
            if (voterChild) {
                 parentNode.children.unshift(node);
            } else {
                 parentNode.children.push(node);
            }
        } else {
            topLevelUsers.push(node);
        }
    });
    
    root.children = topLevelUsers;

    return root;
};


export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const data = React.useMemo(() => buildTreeData(campaigns, users, voters), [campaigns, users, voters]);
    const { width, height, ref } = useParentSize();

    if (!data.children || data.children.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-center pt-10">No hay datos de red para mostrar.</p></div>
    }

    return (
        <div ref={ref} style={{ width: '100%', height: '100%' }}>
            <Tree
                width={width}
                height={height}
                data={data}
                identity="id"
                layout="vertical"
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
                        return `${userName} (${node.data.voterCount || 0})`;
                    }
                    if (node.id.toString().startsWith('Votantes')) {
                        return `Votantes (${node.data.voterCount})`
                    }
                    return node.id.toString();
                }}
                labelPosition="right"
                labelOffset={10}
                margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
                motionConfig="stiff"
            />
        </div>
    );
};
