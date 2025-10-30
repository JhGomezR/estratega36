"use client"
import * as React from 'react';
import type { User, Role, Campaign } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

    const roots: TreeNode[] = [];
    userMap.forEach(node => {
        if (node.parentId && userMap.has(node.parentId)) {
            userMap.get(node.parentId)!.children.push(node);
        }
    });
    
    // Sort children for consistent ordering if needed
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
            {/* The User Card */}
            <Card className="min-w-[250px] w-fit max-w-sm z-10 bg-card shadow-md border-2 border-primary/20">
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
                    </div>
                </CardContent>
            </Card>

            {/* Render children if they exist */}
            {node.children.length > 0 && (
                <div className="flex justify-center pt-8 relative">
                    {/* Vertical line from parent to horizontal connector */}
                    <div className="absolute top-0 h-8 w-px bg-border -translate-y-px" />

                    {/* Horizontal line connecting all children */}
                    {node.children.length > 1 && (
                        <div className="absolute top-8 left-1/2 right-1/2 h-px bg-border"
                             style={{ left: 'calc(1.5rem)', right: 'calc(1.5rem)' }}
                        />
                    )}
                    
                    {/* Children nodes */}
                    <div className="flex gap-x-8">
                        {node.children.map((child) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Vertical line from horizontal connector to child */}
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

export const NetworkTree = ({ users, roles, campaigns }: { users: User[], roles: Role[], campaigns: Campaign[] }) => {
    const userMap = React.useMemo(() => buildTree(users, roles), [users, roles]);

    const campaignsWithUsers = campaigns
        .map(campaign => {
            const campaignUsers = users.filter(user => user.campaignIds.includes(campaign.id));
            // Find users who are roots for this campaign (no parent or parent not in this campaign)
            const rootUsers = campaignUsers.filter(user => !user.parentId || !userMap.has(user.parentId));
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
                             {/* Vertical line from campaign to horizontal connector */}
                            <div className="absolute top-0 h-8 w-px bg-border" />

                            {/* Horizontal line for root users */}
                            {campaign.rootUsers.length > 1 && (
                                 <div className="absolute top-8 h-px bg-border"
                                      style={{ left: 'calc(50% - 50vw + 1.5rem)', right: 'calc(50% - 50vw + 1.5rem)', minWidth: 'calc(100% - 3rem)' }}
                                 />
                            )}
                            
                            <div className="flex gap-x-8">
                                {campaign.rootUsers.map((user) => {
                                    const node = userMap.get(user.id);
                                    if (!node) return null;
                                    return (
                                        <div key={node.id} className="flex flex-col items-center relative">
                                            {/* Vertical line from horizontal connector to node */}
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
