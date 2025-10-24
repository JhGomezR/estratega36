"use client"
import * as React from 'react';
import type { User, Role, Campaign } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface TreeNode extends User {
    children: TreeNode[];
    roleName?: string;
}

const buildTree = (users: User[], roles: Role[]): Map<string, TreeNode> => {
    const userMap = new Map<string, TreeNode>();
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
        userMap.set(user.id, { ...user, children: [], roleName: roleMap.get(user.roleId) || user.roleId });
    });

    userMap.forEach(node => {
        if (node.parentId && userMap.has(node.parentId)) {
            userMap.get(node.parentId)!.children.push(node);
        }
    });

    return userMap;
};

const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
    <div className="relative flex justify-center">
        <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-lg inline-block text-center shadow-md">
            <h3 className="text-xl font-bold text-primary">{campaign.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{campaign.campaignType}</p>
        </div>
    </div>
);


const Node = ({ node, campaigns, userMap }: { node: TreeNode; campaigns: Campaign[]; userMap: Map<string, TreeNode>}) => {
    const userCampaigns = campaigns.filter(c => node.campaignIds.includes(c.id) && c.status === 'En Campaña');

    return (
        <div className="flex flex-col items-center relative">
            <Card className="min-w-[280px] w-fit max-w-sm z-10 bg-card shadow-md my-2 border-2 border-primary/20">
                <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border">
                            <AvatarImage src={node.avatar} alt={`${node.firstName} avatar`} data-ai-hint="person portrait" />
                            <AvatarFallback>{node.firstName[0]}{node.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold">{node.firstName} {node.lastName}</p>
                            <Badge variant="secondary" className="capitalize mt-1 text-xs">{node.roleName}</Badge>
                        </div>
                    </div>
                     {userCampaigns.length > 0 && (
                        <div className="pt-2 border-t">
                            <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Campañas Activas:</p>
                            <div className="flex flex-wrap gap-1">
                                {userCampaigns.map(campaign => (
                                     <TooltipProvider key={campaign.id}>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Badge variant="outline">{campaign.name}</Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{campaign.name}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {node.children.length > 0 && (
                <div className="flex justify-center relative">
                    <div className="absolute top-0 h-8 w-px bg-border -translate-y-2" />
                    
                    <div className="flex gap-x-8 pt-8">
                        {node.children.map((child, index) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                <div className={cn(
                                    "absolute top-0 h-px bg-border",
                                    index === 0 ? 'left-1/2 w-1/2' : 'right-1/2 w-1/2',
                                    node.children.length === 1 && 'w-0'
                                )} />
                                <div className="absolute top-0 h-8 w-px bg-border" />
                                <Node node={child} campaigns={campaigns} userMap={userMap} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const NetworkTree = ({ users, roles, campaigns }: { users: User[], roles: Role[], campaigns: Campaign[] }) => {
    const userMap = React.useMemo(() => buildTree(users, roles), [users, roles]);

    const campaignsWithUsers = campaigns
        .map(campaign => {
            const campaignUsers = users.filter(user => user.campaignIds.includes(campaign.id));
            const rootUsers = campaignUsers.filter(user => !user.parentId || !userMap.has(user.parentId));
            return { ...campaign, rootUsers };
        })
        .filter(campaign => campaign.rootUsers.length > 0);

    if (campaignsWithUsers.length === 0) {
        return <p className="text-muted-foreground text-center">No hay campañas con usuarios para mostrar en la red.</p>
    }

    return (
        <div className="flex justify-center">
            <div className="inline-flex flex-col items-stretch gap-y-12">
                {campaignsWithUsers.map(campaign => (
                    <div key={campaign.id} className="flex flex-col items-center">
                        <CampaignCard campaign={campaign} />
                         <div className="flex justify-center relative">
                             <div className="absolute top-0 h-8 w-px bg-border" />
                            <div className="flex gap-x-8 pt-8">
                                {campaign.rootUsers.map((user, index) => {
                                    const node = userMap.get(user.id);
                                    if (!node) return null;
                                    return (
                                        <div key={node.id} className="flex flex-col items-center relative">
                                            <div className={cn(
                                                "absolute top-0 h-px bg-border",
                                                index === 0 ? 'left-1/2 w-1/2' : 'right-1/2 w-1/2',
                                                campaign.rootUsers.length === 1 && 'w-0'
                                            )} />
                                            <div className="absolute top-0 h-8 w-px bg-border" />
                                            <Node node={node} campaigns={campaigns} userMap={userMap} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
