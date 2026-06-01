
"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role, Campaign } from '@/lib/types';

interface ChartData {
    name: string;
    id: string;
    roleName: string;
    children: ChartData[];
    value: number;
    isVoter?: boolean;
    isCampaign?: boolean;
}

function stringToColor(str: string): am5.Color {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return am5.color(color);
}


const buildHierarchyData = (campaign: Campaign, allUsers: User[], allVoters: Voter[], allRoles: Role[]): ChartData => {
    const roleMap = new Map(allRoles.map(role => [role.id, role.name]));
    const adminRolesToExclude = ['admin', 'super'];

    // 1. Get users for the current campaign, excluding admin/super roles
    const campaignUsers = allUsers.filter(u => {
        const roleName = roleMap.get(u.roleId)?.toLowerCase() || '';
        return u.status === 'activo' && u.campaignIds.includes(campaign.id) && !adminRolesToExclude.includes(roleName);
    });
    const campaignUserIds = new Set(campaignUsers.map(u => u.id));

    // 2. Recursive function to build a branch for a given user
    const buildBranch = (user: User): ChartData => {
        // Find users who have the current user as their parent
        const childrenUsers = campaignUsers.filter(child => child.parentId === user.id);
        
        // Find voters registered by the current user
        const childrenVoters = allVoters
            .filter(voter => voter.promoterId === user.id && voter.status === 'activo')
            .map(voter => ({
                id: voter.id,
                name: `${voter.firstName} ${voter.lastName}`,
                roleName: "Votante",
                children: [],
                value: 1,
                isVoter: true,
            }));

        // Recursively build branches for child users
        const userChildrenNodes = childrenUsers.map(buildBranch);
        
        const allChildren = [...userChildrenNodes, ...childrenVoters];

        const totalValue = allChildren.reduce((sum, child) => sum + child.value, 0);

        return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            roleName: roleMap.get(user.roleId) || 'Sin Rol',
            children: allChildren,
            value: totalValue > 0 ? totalValue : 1, // Node should have value even if it has no children
        };
    };

    // 3. Find root users (those without a parent in this campaign)
    const rootUsers = campaignUsers.filter(user => {
        return !user.parentId || !campaignUserIds.has(user.parentId);
    });

    // 4. Build the tree starting from root users
    const rootNodes = rootUsers.map(buildBranch);

    // 5. Create the final campaign root node
    const campaignRoot: ChartData = {
        id: campaign.id,
        name: campaign.name,
        roleName: "Campaña",
        isCampaign: true,
        children: rootNodes,
        value: rootNodes.reduce((sum, node) => sum + node.value, 0),
    };

    return campaignRoot;
};



interface NetworkHierarchyChartProps {
    campaign: Campaign;
    users: User[];
    voters: Voter[];
    roles: Role[];
}

export default function NetworkHierarchyChart({ campaign, users, voters, roles }: NetworkHierarchyChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    const data = React.useMemo(() => buildHierarchyData(campaign, users, voters, roles), [campaign, users, voters, roles]);

    useLayoutEffect(() => {
        if (!chartRef.current || !data) return;

        let root = am5.Root.new(chartRef.current);
        
        root.setThemes([am5themes_Animated.new(root)]);

        let zoomableContainer = root.container.children.push(
          am5.ZoomableContainer.new(root, {
            width: am5.p100,
            height: am5.p100,
            wheelable: true,
            pinchZoom: true
          })
        );
        
        zoomableContainer.children.push(am5.ZoomTools.new(root, {
            target: zoomableContainer
        }));

        let series = zoomableContainer.contents.children.push(am5hierarchy.Tree.new(root, {
            valueField: "value",
            categoryField: "name",
            childDataField: "children",
            orientation: "vertical",
            downDepth: 1,
            initialDepth: 10,
            singleBranchOnly: false,
        }));
        
        series.nodes.template.setAll({
            toggleKey: "active",
            tooltipText: "{name}\\nRol: {roleName}\\nVotantes: {value}",
            cursor: "pointer",
        } as any);

        series.circles.template.adapters.add("fill", (fill, target) => {
            const dataContext = target.dataItem?.dataContext as ChartData | undefined;
            if (dataContext?.isCampaign) return am5.color(0x1A237E);
            if (dataContext?.isVoter) return am5.color(0xFFC107);
            if (dataContext?.roleName) {
                return stringToColor(dataContext.roleName);
            }
            return fill;
        });

        series.circles.template.setAll({
          radius: 20,
        });

        series.labels.template.setAll({
            fontSize: 10,
            text: "{name}",
            oversizedBehavior: "wrap",
            textAlign: "center",
            width: 70
        });
        
        series.links.template.setAll({
            strokeWidth: 2,
        });

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data]);

    if (!data || (data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay usuarios en esta campaña para mostrar en la red.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
