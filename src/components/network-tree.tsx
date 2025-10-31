"use client"
import * as React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { ResponsiveOrganizationChart, type OrganizationChartDatum } from '@nivo/org-chart';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck } from 'lucide-react';
import { useTheme } from 'next-themes';

interface CustomDatum extends OrganizationChartDatum {
    data: {
        type: 'campaign' | 'user' | 'voter';
        id: string;
        name: string;
        subLabel?: string;
        avatar?: string;
        directChildrenCount?: number;
        voterCount?: number;
    };
}

const Node = ({ node, style, onNodeClick }: { node: any; style: any; onNodeClick: (node: any) => void }) => {
    const { type, name, subLabel, avatar, directChildrenCount, voterCount } = node.data.data;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    if (type === 'campaign') {
        return (
            <div style={style} onClick={() => onNodeClick(node)}>
                <Card className="min-w-[200px] max-w-xs shadow-lg bg-primary text-primary-foreground text-center">
                    <CardContent className="p-3">
                        <p className="font-bold text-lg">{name}</p>
                        {subLabel && <p className="text-sm opacity-90 capitalize">{subLabel}</p>}
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (type === 'voter') {
         return (
            <div style={style} onClick={() => onNodeClick(node)}>
                <div className={`flex items-center justify-center size-10 rounded-full ${isDark ? 'bg-muted/80 border-border' : 'bg-secondary border-secondary-foreground/20'} border-2`}>
                    <UserCheck className={`h-5 w-5 ${isDark ? 'text-foreground' : 'text-secondary-foreground'}`} />
                </div>
            </div>
        );
    }

    return (
        <div style={style} onClick={() => onNodeClick(node)}>
             <Card className="min-w-[280px] w-fit max-w-sm z-10 shadow-lg border-2 border-primary/30">
                <CardContent className="p-3">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2">
                            <AvatarImage src={avatar} alt={`${name} avatar`} data-ai-hint="person portrait"/>
                            <AvatarFallback className="text-xl">{name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold text-base">{name}</p>
                            <Badge variant="secondary" className="capitalize mt-1 font-medium">{subLabel}</Badge>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-muted-foreground self-start">
                             {(directChildrenCount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5" title="Equipo directo">
                                    <Users className="h-4 w-4" />
                                    <span className="font-bold text-sm">{directChildrenCount}</span>
                                </div>
                            )}
                             {(voterCount ?? 0) > 0 && (
                                <div className="flex items-center gap-1.5" title="Votantes registrados">
                                    <UserCheck className="h-4 w-4" />
                                    <span className="font-bold text-sm">{voterCount}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


const buildTreeData = (campaigns: Campaign[], users: User[], roles: Role[], voters: Voter[]): CustomDatum[] => {
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    const userNodes = new Map<string, CustomDatum>();
    
    // Create nodes for all users
    users.forEach(user => {
        const userVoters = voters.filter(v => v.promoterId === user.id);
        const node: CustomDatum = {
            id: user.id,
            data: {
                type: 'user',
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                subLabel: roleMap.get(user.roleId) || user.roleId,
                avatar: user.avatar,
                voterCount: userVoters.length,
            },
            children: userVoters.map(v => ({
                id: `voter-${v.id}`,
                data: {
                    type: 'voter',
                    id: v.id,
                    name: `Votante ${v.id}`
                },
                children: []
            })),
        };
        userNodes.set(user.id, node);
    });

    // Link children to parents
    users.forEach(user => {
        if (user.parentId && userNodes.has(user.parentId)) {
            const parentNode = userNodes.get(user.parentId);
            const childNode = userNodes.get(user.id);
            if (parentNode && childNode) {
                parentNode.children.push(childNode);
            }
        }
    });

    // Update direct children count
    userNodes.forEach(node => {
        node.data.directChildrenCount = node.children.filter(c => c.data.type === 'user').length;
    });

    // Create campaign nodes
    return campaigns
        .filter(c => c.status === 'En Campaña')
        .map(campaign => {
            const campaignUsers = users.filter(user => user.campaignIds.includes(campaign.id));
            const rootUserIds = new Set(campaignUsers.filter(user => !user.parentId || !campaignUsers.some(u => u.id === user.parentId)).map(u => u.id));
            
            return {
                id: campaign.id,
                data: {
                    type: 'campaign',
                    id: campaign.id,
                    name: campaign.name,
                    subLabel: campaign.campaignType,
                },
                children: Array.from(rootUserIds).map(id => userNodes.get(id)).filter(Boolean) as CustomDatum[],
            };
        });
};


export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const treeData = React.useMemo(() => buildTreeData(campaigns, users, roles, voters), [campaigns, users, roles, voters]);
    const { resolvedTheme } = useTheme();

    if (treeData.length === 0) {
        return <p className="text-muted-foreground text-center pt-10">No hay campañas con usuarios para mostrar en la red.</p>
    }

    // Since we can have multiple campaigns, we'll render a chart for each
    return (
        <div className="w-full h-full flex flex-col items-center gap-16 overflow-auto p-8">
            {treeData.map(rootNode => (
                <div key={rootNode.id} className="w-full h-[600px]">
                    <ResponsiveOrganizationChart
                        data={rootNode}
                        identity="id"
                        nodeComponent={Node}
                        linkColor={() => (resolvedTheme === 'dark' ? '#3e4b5f' : '#cbd5e1')}
                        linkThickness={2}
                        nodeColor={() => 'transparent'}
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            ))}
        </div>
    );
};
