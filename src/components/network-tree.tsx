
"use client"
import React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { ResponsiveSankey, type SankeyDatum } from '@nivo/sankey';
import { Card, CardContent } from './ui/card';
import { theme } from 'tailwind.config';
import { useTheme } from 'next-themes';

interface SankeyNode extends SankeyDatum {
    id: string;
    nodeColor?: string;
}

interface SankeyLink {
    source: string;
    target: string;
    value: number;
}

interface SankeyChartData {
    nodes: SankeyNode[];
    links: SankeyLink[];
}

const buildSankeyData = (campaigns: Campaign[], users: User[], roles: Role[], voters: Voter[]): SankeyChartData => {
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];

    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    const activeCampaigns = campaigns.filter(c => c.status === 'En Campaña');

    if (activeCampaigns.length === 0) {
        return { nodes: [], links: [] };
    }

    // Add campaign node(s)
    activeCampaigns.forEach(campaign => {
        nodes.push({ id: campaign.name, nodeColor: "hsl(var(--primary))" });
    });

    const campaignUsers = users.filter(user =>
        activeCampaigns.some(c => user.campaignIds.includes(c.id))
    );
    
    // Add user nodes
    campaignUsers.forEach(user => {
        nodes.push({
            id: user.id,
            nodeColor: "hsl(var(--accent))"
        });
    });

    // Create links
    campaignUsers.forEach(user => {
        // Link from campaign to top-level users
        if (!user.parentId || !campaignUsers.some(u => u.id === user.parentId)) {
             user.campaignIds.forEach(campaignId => {
                const campaign = activeCampaigns.find(c => c.id === campaignId);
                if (campaign) {
                    links.push({
                        source: campaign.name,
                        target: user.id,
                        value: 1 // Base value
                    });
                }
            });
        }
        // Link from parent user to child user
        else if (user.parentId) {
             links.push({
                source: user.parentId,
                target: user.id,
                value: 1 // Base value
            });
        }
    });

    // Link users to voters
    const voterCounts: Record<string, number> = {};
     voters.forEach(voter => {
        if(campaignUsers.some(u => u.id === voter.promoterId)) {
            voterCounts[voter.promoterId] = (voterCounts[voter.promoterId] || 0) + 1;
        }
    });

    Object.entries(voterCounts).forEach(([promoterId, count]) => {
         // Create a synthetic node for voters of each promoter
        const voterNodeId = `Votantes de ${promoterId}`;
        nodes.push({ id: voterNodeId, nodeColor: "hsl(var(--secondary-foreground))" });

        links.push({
            source: promoterId,
            target: voterNodeId,
            value: count
        });
    });

    const uniqueNodes = Array.from(new Map(nodes.map(node => [node.id, node])).values());

    return { nodes: uniqueNodes, links };
};


export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const { theme } = useTheme();
    const data = React.useMemo(() => buildSankeyData(campaigns, users, roles, voters), [campaigns, users, roles, voters]);

    const getUserName = (id: string | undefined) => {
        if (!id) return '';
        const user = users.find(u => u.id === id);
        if (user) {
            return `${user.firstName} ${user.lastName}`;
        }
        if (id.startsWith('Votantes de')) {
            const promoter = users.find(u => u.id === id.replace('Votantes de ', ''));
            return promoter ? `Votantes de ${promoter.firstName}` : 'Votantes';
        }
        return id;
    }


    if (data.nodes.length === 0) {
        return <p className="text-muted-foreground text-center pt-10">No hay campañas activas con usuarios para mostrar en la red.</p>
    }

    return (
        <ResponsiveSankey
            data={data}
            margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
            align="justify"
            colors={d => d.nodeColor || '#000'}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={24}
            nodeBorderWidth={0}
            nodeBorderColor={{
                from: 'color',
                modifiers: [['darker', 0.8]],
            }}
            nodeTooltip={node => (
                <div className="p-2 bg-background border rounded shadow-lg">
                    <strong>{getUserName(node.id as string)}</strong>
                     {node.value && <br />}
                    {node.value && `Valor: ${node.value}`}
                </div>
            )}
            linkHoverOthersOpacity={0.1}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={16}
            labelTextColor={{
                from: 'color',
                modifiers: [['darker', 1]],
            }}
            legends={[
                {
                    anchor: 'bottom-right',
                    direction: 'column',
                    translateX: 130,
                    itemWidth: 100,
                    itemHeight: 14,
                    itemDirection: 'right-to-left',
                    itemsSpacing: 2,
                    itemTextColor: '#999',
                    symbolSize: 14,
                    effects: [
                        {
                            on: 'hover',
                            style: {
                                itemTextColor: '#000',
                            },
                        },
                    ],
                },
            ]}
            theme={{
                labels: {
                    text: {
                       fill: theme === 'dark' ? '#fff' : '#000',
                       fontSize: 12,
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
            label={d => getUserName(d.id as string)}
        />
    );
};
