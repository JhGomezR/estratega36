"use client";

import React, { useState, useEffect } from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { NetworkTree, buildTreeData } from './network-tree';
import { Skeleton } from './ui/skeleton';

interface NetworkTreeClientProps {
    users: User[];
    roles: Role[];
    campaigns: Campaign[];
    voters: Voter[];
}

export const NetworkTreeClient = ({ users, roles, campaigns, voters }: NetworkTreeClientProps) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const data = React.useMemo(() => buildTreeData(users, voters), [users, voters]);

    if (!isMounted) {
        return <Skeleton className="h-full w-full" />;
    }
    
    return <NetworkTree data={data} />;
};
