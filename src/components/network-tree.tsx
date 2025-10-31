"use client"
import * as React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck } from 'lucide-react';

interface CustomTreemapProps {
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    payload: any;
    name: string;
    // Custom properties
    type: 'campaign' | 'user' | 'voter';
    avatar?: string;
    subLabel?: string;
    directChildrenCount?: number;
    voterCount?: number;
    color: string;
}

const COLORS = ['#8889DD', '#9597E4', '#8DC77B', '#A5D297', '#E2CF45', '#F8C12D'];

const CustomTreemapContent = (props: CustomTreemapProps) => {
    const { depth, x, y, width, height, name, type, avatar, subLabel, directChildrenCount, voterCount, color } = props;
    
    // Don't render text for very small boxes or for voters
    if (width < 80 || height < 40 || type === 'voter') {
        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                        fill: color,
                        stroke: '#fff',
                        strokeWidth: 2 / (depth + 1e-10),
                        strokeOpacity: 1 / (depth + 1e-10),
                    }}
                />
            </g>
        );
    }
    
    if (type === 'campaign') {
         return (
             <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                        fill: 'hsl(var(--primary))',
                        stroke: '#fff',
                        strokeWidth: 2,
                        strokeOpacity: 1,
                    }}
                />
                <foreignObject x={x + 5} y={y + 5} width={width - 10} height={height - 10}>
                    <div className="text-primary-foreground text-center flex flex-col justify-center h-full">
                         <p className="font-bold text-lg leading-tight">{name}</p>
                         {subLabel && <p className="text-sm opacity-90 capitalize">{subLabel}</p>}
                    </div>
                </foreignObject>
             </g>
         )
    }

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: color,
                    stroke: '#fff',
                    strokeWidth: 2 / (depth + 1e-10),
                    strokeOpacity: 1 / (depth + 1e-10),
                }}
            />
            <foreignObject x={x + 5} y={y + 5} width={width - 10} height={height - 10} className="overflow-hidden">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 bg-background/50">
                        <AvatarImage src={avatar} alt={`${name} avatar`} data-ai-hint="person portrait"/>
                        <AvatarFallback>{name ? name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'NN'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow truncate">
                        <p className="font-semibold text-sm truncate">{name}</p>
                        <Badge variant="secondary" className="capitalize mt-1 font-medium text-xs">{subLabel}</Badge>
                    </div>
                </div>
                 <div className="flex items-center gap-4 text-muted-foreground mt-2 pl-1">
                     {(directChildrenCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1" title="Equipo directo">
                            <Users className="h-3 w-3" />
                            <span className="font-bold text-xs">{directChildrenCount}</span>
                        </div>
                    )}
                     {(voterCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1" title="Votantes registrados">
                            <UserCheck className="h-3 w-3" />
                            <span className="font-bold text-xs">{voterCount}</span>
                        </div>
                    )}
                </div>
            </foreignObject>
        </g>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (data.type === 'voter') {
             return (
                 <Card>
                    <CardContent className="p-2">
                        <div className="flex items-center gap-2">
                           <UserCheck className="h-4 w-4 text-muted-foreground" />
                           <p className="text-sm font-medium">Votante Registrado</p>
                        </div>
                    </CardContent>
                </Card>
             )
        }
         if (data.type === 'user') {
             return (
                <Card>
                    <CardContent className="p-3">
                         <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2">
                                <AvatarImage src={data.avatar} alt={`${data.name} avatar`} data-ai-hint="person portrait"/>
                                <AvatarFallback>{data.name ? data.name.split(' ').map((n:string) => n[0]).join('').slice(0, 2) : 'NN'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{data.name}</p>
                                <Badge variant="secondary" className="capitalize mt-1 font-medium">{data.subLabel}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }
    }
    return null;
};


const buildTreeData = (campaigns: Campaign[], users: User[], roles: Role[], voters: Voter[]) => {
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    const buildHierarchy = (userId: string) => {
        const user = users.find(u => u.id === userId)!;
        const directChildren = users.filter(u => u.parentId === userId);
        const directVoters = voters.filter(v => v.promoterId === userId);

        const childrenNodes = directChildren.map(child => buildHierarchy(child.id));
        const voterNodes = directVoters.map(voter => ({
            id: voter.id,
            name: `${voter.firstName} ${voter.lastName}`,
            size: 1, // Voters are the smallest unit
            type: 'voter'
        }));
        
        const allChildren = [...childrenNodes, ...voterNodes];

        return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            subLabel: roleMap.get(user.roleId) || user.roleId,
            avatar: user.avatar,
            type: 'user',
            directChildrenCount: directChildren.length,
            voterCount: directVoters.length,
            children: allChildren.length > 0 ? allChildren : undefined,
            size: allChildren.reduce((acc, child) => acc + (child.size || 1), 1) // User has size + size of children
        };
    };

    const activeCampaigns = campaigns.filter(c => c.status === 'En Campaña');

    if (activeCampaigns.length === 0) return null;

    const campaignUsers = users.filter(user => activeCampaigns.some(c => user.campaignIds.includes(c.id)));
    const rootUsers = campaignUsers.filter(user => !user.parentId || !campaignUsers.some(u => u.id === user.parentId));
    
    const rootNodes = rootUsers.map(user => buildHierarchy(user.id));
    
    return {
        name: activeCampaigns.map(c => c.name).join(' & '),
        type: 'campaign',
        subLabel: activeCampaigns.map(c => c.campaignType).join(' / '),
        children: rootNodes,
    };
};

export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const treeData = React.useMemo(() => buildTreeData(campaigns, users, roles, voters), [campaigns, users, roles, voters]);

    if (!treeData) {
        return <p className="text-muted-foreground text-center pt-10">No hay campañas activas con usuarios para mostrar en la red.</p>
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <Treemap
                data={[treeData]}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                content={<CustomTreemapContent color={COLORS[0]} />}
                isAnimationActive={false} // Animation can be buggy with complex custom content
            >
                <Tooltip content={<CustomTooltip />} />
            </Treemap>
        </ResponsiveContainer>
    );
};
