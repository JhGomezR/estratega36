"use client"
import * as React from 'react';
import type { User, Role } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TreeNode extends User {
    children: TreeNode[];
    roleName?: string;
}

const buildTree = (users: User[], roles: Role[]): TreeNode[] => {
    const userMap = new Map<string, TreeNode>();
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
        userMap.set(user.id, { ...user, children: [], roleName: roleMap.get(user.roleId) || user.roleId });
    });

    const tree: TreeNode[] = [];
    userMap.forEach(node => {
        if (node.parentId && userMap.has(node.parentId)) {
            userMap.get(node.parentId)!.children.push(node);
        } else {
            tree.push(node);
        }
    });

    return tree;
};

const Node = ({ node }: { node: TreeNode }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <div className="relative pl-8">
            {/* Vertical connector from parent */}
            <div className="absolute left-4 top-0 w-px h-full bg-border" />
            
            <div className="relative flex items-center">
                {/* Horizontal connector */}
                <div className="absolute left-0 top-1/2 w-4 h-px bg-border" />

                <Card className="min-w-[280px] w-fit max-w-sm z-10 bg-card shadow-md my-2">
                    <CardContent className="p-3 flex items-center gap-4">
                         <Avatar className="h-12 w-12 border">
                            <AvatarImage src={node.avatar} alt={`${node.firstName} avatar`} data-ai-hint="person portrait"/>
                            <AvatarFallback>{node.firstName[0]}{node.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold text-sm">{node.firstName} {node.lastName}</p>
                            <p className="text-xs text-muted-foreground">{node.email}</p>
                            <Badge variant="secondary" className="capitalize mt-1 text-xs">{node.roleName}</Badge>
                        </div>
                        {node.children.length > 0 && (
                             <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-muted-foreground hover:text-foreground ml-auto p-1">
                                {isCollapsed ? '+' : '−'}
                            </button>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {!isCollapsed && node.children.length > 0 && (
                <div className="relative">
                    {node.children.map((child, index) => (
                        <div key={child.id} className="relative">
                            {/* Final vertical line for last child */}
                            {index === node.children.length - 1 && <div className="absolute left-4 top-0 w-px h-1/2 bg-card z-0" />}
                            <Node node={child} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const NetworkTree = ({ users, roles }: { users: User[], roles: Role[] }) => {
    const tree = React.useMemo(() => buildTree(users, roles), [users, roles]);

    if (tree.length === 0) {
        return <p className="text-muted-foreground text-center">No hay usuarios para mostrar en la red.</p>
    }

    return (
        <div className="flex flex-col items-start space-y-4">
            {tree.map(rootNode => (
                <div key={rootNode.id} className="relative">
                    <Node node={rootNode} />
                </div>
            ))}
        </div>
    );
};
