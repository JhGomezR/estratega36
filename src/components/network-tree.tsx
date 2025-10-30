"use client"
import * as React from 'react';
import type { User, Role, Campaign } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck } from 'lucide-react';

interface TreeNode extends User {
    children: TreeNode[];
    roleName?: string;
    directChildrenCount: number;
    voterCount: number;
}

const buildTree = (users: User[], roles: Role[], voterCounts: Map<string, number>): Map<string, TreeNode> => {
    const userMap = new Map<string, TreeNode>();
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
        userMap.set(user.id, { 
            ...user, 
            children: [], 
            roleName: roleMap.get(user.roleId) || user.roleId, 
            directChildrenCount: 0,
            voterCount: voterCounts.get(user.id) || 0
        });
    });

    userMap.forEach(node => {
        if (node.parentId && userMap.has(node.parentId)) {
            userMap.get(node.parentId)!.children.push(node);
        }
    });
    
    userMap.forEach(node => {
        node.directChildrenCount = node.children.length;
        // Recursively add children's voter counts to the parent
        node.children.forEach(child => {
            node.voterCount += child.voterCount;
        });
    });

    userMap.forEach(node => {
        node.children.sort((a, b) => a.firstName.localeCompare(b.firstName));
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


const Node = ({ node }: { node: TreeNode; }) => {
    return (
        <div className="flex flex-col items-center relative">
            <Card className="min-w-[280px] w-fit max-w-sm z-10 bg-card shadow-md border-2 border-primary/20">
                <CardContent className="p-3">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border">
                            <AvatarImage src={node.avatar} alt={`${node.firstName} avatar`} data-ai-hint="person portrait" />
                            <AvatarFallback>{node.firstName[0]}{node.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold">{node.firstName} {node.lastName}</p>
                            <Badge variant="secondary" className="capitalize mt-1 text-xs">{node.roleName}</Badge>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-muted-foreground">
                            <div className="flex items-center gap-1.5" title="Reportes directos">
                                <Users className="h-4 w-4" />
                                <span className="font-bold text-sm">{node.directChildrenCount}</span>
                            </div>
                             <div className="flex items-center gap-1.5" title="Votantes en la red">
                                <UserCheck className="h-4 w-4" />
                                <span className="font-bold text-sm">{node.voterCount}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {node.children.length > 0 && (
                <div className="flex justify-center pt-8 relative">
                    <div className="absolute top-0 h-8 w-px bg-border -translate-y-px" />

                    {node.children.length > 1 && (
                         <div className="absolute top-8 left-1/2 right-1/2 h-px bg-border" style={{left: 'calc(50% - (100% / 2 /' + node.children.length + '))', right: 'calc(50% - (100% / 2 /' + node.children.length + '))'}} />
                    )}
                    
                    <div className="flex gap-x-8">
                        {node.children.map((child) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                <div className="absolute top-0 h-8 w-px bg-border" />
                                <Node node={child} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const NetworkTree = ({ users, roles, campaigns, voterCounts }: { users: User[], roles: Role[], campaigns: Campaign[], voterCounts: Map<string, number> }) => {
    const userMap = React.useMemo(() => buildTree(users, roles, voterCounts), [users, roles, voterCounts]);

    const campaignsWithUsers = campaigns
        .map(campaign => {
            const campaignUsers = users.filter(user => user.campaignIds.includes(campaign.id));
            const rootUsers = campaignUsers.filter(user => {
                 if (!user.parentId) return true;
                 const parent = userMap.get(user.parentId);
                 return !parent || !parent.campaignIds.includes(campaign.id);
            });
            return { ...campaign, rootUsers };
        })
        .filter(campaign => campaign.rootUsers.length > 0);

    if (campaignsWithUsers.length === 0) {
        return <p className="text-muted-foreground text-center">No hay campañas con usuarios para mostrar en la red.</p>
    }

    return (
        <div className="flex justify-center p-4 min-w-full">
            <div className="inline-flex flex-col items-stretch gap-y-12">
                {campaignsWithUsers.map(campaign => (
                    <div key={campaign.id} className="flex flex-col items-center">
                        <CampaignCard campaign={campaign} />
                         <div className="flex justify-center relative pt-8">
                            <div className="absolute top-0 h-8 w-px bg-border" />

                            {campaign.rootUsers.length > 1 && (
                                <div className="absolute top-8 left-0 right-0 h-px bg-border" />
                            )}
                            
                            <div className="flex gap-x-8">
                                {campaign.rootUsers.map((user) => {
                                    const node = userMap.get(user.id);
                                    if (!node) return null;
                                    return (
                                        <div key={node.id} className="flex flex-col items-center relative">
                                            <div className="absolute top-0 h-8 w-px bg-border" />
                                            <Node node={node} />
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
