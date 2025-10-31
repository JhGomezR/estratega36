"use client";

import React from 'react';
import type { User, Role, Campaign, Voter } from '@/lib/types';
import { NetworkTree, buildTreeData } from './network-tree';

interface NetworkTreeClientProps {
    users: User[];
    roles: Role[];
    campaigns: Campaign[];
    voters: Voter[];
}

export const NetworkTreeClient = ({ users, roles, campaigns, voters }: NetworkTreeClientProps) => {
    const data = React.useMemo(() => buildTreeData(campaigns, users, voters), [campaigns, users, voters]);
    return <NetworkTree data={data} />;
};
