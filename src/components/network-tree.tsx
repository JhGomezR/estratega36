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

const buildTreeData = (campaigns: Campaign[], users: User[], voters: Voter[]): TreeNode => {
    const activeCampaigns = campaigns.filter(c => c.status === 'En Campaña');

    const root: TreeNode = {
        id: "EstrategaCRM",
        children: [],
    };

    if (activeCampaigns.length === 0 || users.length === 0) {
        return root;
    }

    const voterCounts = new Map<string, number>();
    voters.forEach(voter => {
        voterCounts.set(voter.promoterId, (voterCounts.get(voter.promoterId) || 0) + 1);
    });

    const userNodes = new Map<string, TreeNode>();

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

    const topLevelNodes: TreeNode[] = [];
    userNodes.forEach(node => {
        const parentId = node.user?.parentId;
        if (parentId && userNodes.has(parentId)) {
            const parentNode = userNodes.get(parentId)!;
            if (!parentNode.children) {
                parentNode.children = [];
            }
            // Add user node, but also voter nodes if they exist
            const existingVoterNode = parentNode.children.find(c => c.id.startsWith('Votantes de'));
            if(existingVoterNode) {
                 parentNode.children.splice(parentNode.children.indexOf(existingVoterNode), 0, node);
            } else {
                 parentNode.children.push(node);
            }
        } else {
            topLevelNodes.push(node);
        }
    });

    root.children = topLevelNodes;

    return root;
};


export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const data = React.useMemo(() => buildTreeData(campaigns, users, voters), [campaigns, users, voters]);
    
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
