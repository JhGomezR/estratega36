
"use client"
import React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { ResponsiveOrganizationChart, type OrganizationChartDatum } from '@nivo/sankey';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Users, UserCheck } from 'lucide-react';
import { Badge } from './ui/badge';

interface CustomNodeData extends OrganizationChartDatum {
  id: string;
  name: string;
  subLabel?: string;
  avatar?: string;
  teamCount?: number;
  voterCount?: number;
  children?: CustomNodeData[];
}

const CustomNode = ({ node, style, onMouseEnter, onMouseLeave }: { node: { data: CustomNodeData }, style: any, onMouseEnter: any, onMouseLeave: any }) => {
    const name = node.data.name || '';
    return (
        <div
            style={{
                ...style,
                transform: `translate(${style.transform.translateX}px,${style.transform.translateY}px)`,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Card className="shadow-md hover:shadow-xl transition-shadow w-[200px] bg-background">
                <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2">
                           <AvatarImage src={node.data.avatar} data-ai-hint="person portrait"/>
                           <AvatarFallback>
                                {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                           </AvatarFallback>
                        </Avatar>
                        <div className="truncate flex-1">
                            <p className="font-bold text-sm truncate">{name}</p>
                            {node.data.subLabel && <Badge variant="secondary" className="mt-1 capitalize text-xs">{node.data.subLabel}</Badge>}
                        </div>
                    </div>
                    {( (node.data.teamCount ?? 0) > 0 || (node.data.voterCount ?? 0) > 0) && (
                         <div className="flex items-center gap-4 text-muted-foreground mt-2 pt-2 border-t text-xs">
                             {(node.data.teamCount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5" title="Miembros del equipo">
                                    <Users className="h-3 w-3" />
                                    <span className="font-semibold">{node.data.teamCount}</span>
                                </div>
                            )}
                             {(node.data.voterCount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5" title="Votantes registrados">
                                    <UserCheck className="h-3 w-3" />
                                    <span className="font-semibold">{node.data.voterCount}</span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const buildTreeData = (campaigns: Campaign[], users: User[], roles: Role[], voters: Voter[]): CustomNodeData | null => {
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    const buildHierarchy = (userId: string): CustomNodeData => {
        const user = users.find(u => u.id === userId)!;
        const directChildren = users.filter(u => u.parentId === userId);
        const directVoters = voters.filter(v => v.promoterId === userId);

        const childrenNodes = directChildren.map(child => buildHierarchy(child.id));

        return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            subLabel: roleMap.get(user.roleId) || user.roleId,
            avatar: user.avatar,
            teamCount: directChildren.length,
            voterCount: directVoters.length,
            children: childrenNodes.length > 0 ? childrenNodes : undefined,
        };
    };

    const activeCampaigns = campaigns.filter(c => c.status === 'En Campaña');

    if (activeCampaigns.length === 0) return null;

    const campaignUsers = users.filter(user => activeCampaigns.some(c => user.campaignIds.includes(c.id)));
    const rootUsers = campaignUsers.filter(user => !user.parentId || !campaignUsers.some(u => u.id === user.parentId));
    
    const rootNodes = rootUsers.map(user => buildHierarchy(user.id));
    
    // Create a single root node for the campaign
    return {
        id: activeCampaigns.map(c => c.id).join('-'),
        name: activeCampaigns.map(c => c.name).join(' & '),
        subLabel: 'Campaña(s) Activa(s)',
        children: rootNodes,
        teamCount: rootUsers.length,
    };
};

export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const treeData = React.useMemo(() => buildTreeData(campaigns, users, roles, voters), [campaigns, users, roles, voters]);

    if (!treeData) {
        return <p className="text-muted-foreground text-center pt-10">No hay campañas activas con usuarios para mostrar en la red.</p>
    }

    return (
        <ResponsiveOrganizationChart
            data={treeData}
            identity="id"
            activeNodeId={treeData.id}
            nodeComponent={CustomNode}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            linkThickness={2}
            nodeColor={() => 'hsl(var(--card))'}
            linkColor={() => 'hsl(var(--border))'}
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
