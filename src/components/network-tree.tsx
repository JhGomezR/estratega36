
"use client"
import React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { ResponsiveTree, type TreeDatum } from '@nivo/tree';
import { useTheme } from 'next-themes';

interface TreeNode extends TreeDatum {
    id: string;
    voterCount?: number;
    user?: User;
    children?: TreeNode[];
}

const buildTreeData = (campaigns: Campaign[], users: User[], voters: Voter[]): TreeNode => {
    const activeCampaigns = campaigns.filter(c => c.status === 'En Campaña');

    const root: TreeNode = {
        id: "Campañas Activas",
    };

    if (activeCampaigns.length === 0) {
        return root;
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
    const { theme } = useTheme();
    const data = React.useMemo(() => buildTreeData(campaigns, users, voters), [campaigns, users, voters]);

    if (!data.children || data.children.length === 0) {
        return <p className="text-muted-foreground text-center pt-10">No hay campañas activas con usuarios para mostrar en la red.</p>
    }

    return (
        <ResponsiveTree
            data={data}
            identity="id"
            nodeSize={20}
            nodeColor={node => node.data.user ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}
            linkThickness={2}
            linkColor={{ from: 'source.color' }}
            theme={{
                labels: {
                    text: {
                        fill: theme === 'dark' ? '#fff' : '#000',
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
                    return `${node.data.user.firstName} ${node.data.user.lastName} (${node.data.voterCount || 0})`;
                }
                if (node.id.toString().startsWith('Votantes')) {
                    return `Votantes (${node.data.voterCount})`
                }
                return node.id.toString();
            }}
            labelOffset={10}
            labelPosition="right"
            layout="vertical"
            margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
            motionConfig="stiff"
        />
    );
};
