"use client"
import React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { ResponsiveTree, type TreeDatum } from '@nivo/tree';

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

    if (activeCampaigns.length === 0 || users.length === 0) {
        return { id: "No hay datos de red para mostrar", children: [] };
    }

    const voterCounts = new Map<string, number>();
    voters.forEach(voter => {
        voterCounts.set(voter.promoterId, (voterCounts.get(voter.promoterId) || 0) + 1);
    });

    const userNodes = new Map<string, TreeNode>();

    // 1. Create a node for each user
    users.forEach(user => {
        const voterCount = voterCounts.get(user.id) || 0;
        const children: TreeNode[] = [];
        if (voterCount > 0) {
            children.push({ id: `Votantes de ${user.id}`, voterCount });
        }
        userNodes.set(user.id, {
            id: user.id,
            voterCount,
            user,
            children,
        });
    });

    // 2. Link nodes to their parents
    const topLevelNodes: TreeNode[] = [];
    userNodes.forEach(node => {
        const parentId = node.user?.parentId;
        if (parentId && userNodes.has(parentId)) {
            const parentNode = userNodes.get(parentId)!;
            // Ensure children array exists
            if (!parentNode.children) {
                parentNode.children = [];
            }
            parentNode.children.push(node);
        } else {
            // This is a top-level user (no parent or parent not found)
            topLevelNodes.push(node);
        }
    });

    root.children = topLevelNodes;

    return root;
};


export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const data = React.useMemo(() => buildTreeData(campaigns, users, voters), [campaigns, users, voters]);
    
    if (!data.children || data.children.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground text-center pt-10">No hay datos de red para mostrar.</p></div>
    }

    return (
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
    );
};
