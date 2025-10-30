
"use client"
import * as React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck } from 'lucide-react';

interface TreeNode extends User {
    children: TreeNode[];
    roleName?: string;
    directChildrenCount: number;
    voters: Voter[];
}

const buildTree = (users: User[], roles: Role[], voters: Voter[]): Map<string, TreeNode> => {
    const userMap = new Map<string, TreeNode>();
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
        const userVoters = voters.filter(v => v.promoterId === user.id);
        userMap.set(user.id, { 
            ...user, 
            children: [], 
            roleName: roleMap.get(user.roleId) || user.roleId, 
            directChildrenCount: 0,
            voters: userVoters
        });
    });

    userMap.forEach(node => {
        if (node.parentId && userMap.has(node.parentId)) {
            userMap.get(node.parentId)!.children.push(node);
        }
    });
    
    userMap.forEach(node => {
        node.directChildrenCount = node.children.length;
        node.children.sort((a, b) => a.firstName.localeCompare(b.firstName));
    });

    return userMap;
};

const CampaignCard = ({ campaign }: { campaign: Campaign }) => (
     <div className="inline-block rounded-lg bg-primary/10 p-4 text-center shadow-md">
        <h3 className="text-xl font-bold text-primary">{campaign.name}</h3>
        <p className="text-sm text-muted-foreground capitalize">{campaign.campaignType}</p>
    </div>
);


const VoterNode = ({ voter }: { voter: Voter }) => {
    return (
        <div className="relative flex flex-col items-center">
            {/* Top connector */}
            <div className="absolute bottom-full left-1/2 h-6 w-px bg-border -translate-x-1/2" />
            <div className="flex items-center justify-center size-10 rounded-full bg-secondary border-2 border-secondary-foreground/20">
                <UserCheck className="h-5 w-5 text-secondary-foreground" />
            </div>
        </div>
    )
};


const Node = ({ node }: { node: TreeNode; }) => {
    const hasChildren = node.children.length > 0;
    const hasVoters = node.voters.length > 0;
    const hasSubordinates = hasChildren || hasVoters;

    return (
        <li className="relative flex flex-col items-center">
            {/* User Card */}
            <Card className="min-w-[280px] w-fit max-w-sm z-10 bg-card shadow-lg border-2 border-primary/30">
                <CardContent className="p-3">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2">
                            <AvatarImage src={node.avatar} alt={`${node.firstName} avatar`} data-ai-hint="person portrait" />
                            <AvatarFallback className="text-xl">{node.firstName[0]}{node.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold text-base">{node.firstName} {node.lastName}</p>
                            <Badge variant="secondary" className="capitalize mt-1 font-medium">{node.roleName}</Badge>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-muted-foreground self-start">
                             {node.directChildrenCount > 0 && (
                                <div className="flex items-center gap-1.5" title="Equipo directo">
                                    <Users className="h-4 w-4" />
                                    <span className="font-bold text-sm">{node.directChildrenCount}</span>
                                </div>
                            )}
                             {node.voters.length > 0 && (
                                <div className="flex items-center gap-1.5" title="Votantes registrados">
                                    <UserCheck className="h-4 w-4" />
                                    <span className="font-bold text-sm">{node.voters.length}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Children container */}
            {hasSubordinates && (
                <ul className="flex pt-12 before:absolute before:top-0 before:left-1/2 before:h-12 before:w-px before:bg-border before:-translate-x-1/2">
                    {node.children.map((child) => (
                         <NodeWithConnector key={child.id}>
                            <Node node={child} />
                        </NodeWithConnector>
                    ))}
                     {node.voters.map((voter) => (
                        <NodeWithConnector key={voter.id}>
                           <VoterNode voter={voter} />
                        </NodeWithConnector>
                    ))}
                </ul>
            )}
        </li>
    );
};

const NodeWithConnector = ({ children }: { children: React.ReactNode }) => (
    <li className="relative flex justify-center px-4">
        {/* Top connector elbow */}
        <div className="absolute right-1/2 top-0 h-6 w-1/2 border-l border-t border-border" />
        <div className="absolute left-1/2 top-0 h-6 w-1/2 border-r border-t border-border" />
        {children}
    </li>
);


export const NetworkTree = ({ users, roles, campaigns, voters }: { users: User[], roles: Role[], campaigns: Campaign[], voters: Voter[] }) => {
    const userMap = React.useMemo(() => buildTree(users, roles, voters), [users, roles, voters]);

    const campaignsWithUsers = campaigns
        .map(campaign => {
            const campaignUsers = users.filter(user => user.campaignIds.includes(campaign.id));
            const rootUsers = campaignUsers.filter(user => {
                 if (!user.parentId) return true;
                 const parent = userMap.get(user.parentId);
                 // Is a root user for THIS campaign if their parent is not in THIS campaign
                 return !parent || !parent.campaignIds.includes(campaign.id);
            });
            return { ...campaign, rootUsers };
        })
        .filter(campaign => campaign.rootUsers.length > 0);

    if (campaignsWithUsers.length === 0) {
        return <p className="text-muted-foreground text-center">No hay campañas con usuarios para mostrar en la red.</p>
    }

    return (
        <div className="flex justify-center p-8 min-w-full overflow-auto">
            <ul className="inline-flex flex-col items-center gap-y-12">
                {campaignsWithUsers.map(campaign => (
                    <li key={campaign.id} className="flex flex-col items-center">
                        <CampaignCard campaign={campaign} />
                        {campaign.rootUsers.length > 0 && (
                             <ul className="flex pt-12 before:absolute before:top-0 before:left-1/2 before:h-12 before:w-px before:bg-border before:-translate-x-1/2">
                                {campaign.rootUsers.map((user) => {
                                    const node = userMap.get(user.id);
                                    if (!node) return null;
                                    return (
                                        <NodeWithConnector key={node.id}>
                                            <Node node={node} />
                                        </NodeWithConnector>
                                    );
                                })}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};
