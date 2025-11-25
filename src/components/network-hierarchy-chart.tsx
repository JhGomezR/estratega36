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

    const usersInCampaign = allUsers.filter(u => u.status === 'activo' && u.campaignIds.includes(campaign.id));
    const userNodes = new Map<string, ChartData>();

    // 1. Create nodes for all users in the campaign
    usersInCampaign.forEach(user => {
        userNodes.set(user.id, {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            roleName: roleMap.get(user.roleId) || 'Sin Rol',
            children: [],
            value: 0 // Will be calculated later
        });
    });

    // 2. Nest users based on parentId
    const rootUsers: ChartData[] = [];
    usersInCampaign.forEach(user => {
        const userNode = userNodes.get(user.id);
        if (user.parentId && userNodes.has(user.parentId)) {
            const parentNode = userNodes.get(user.parentId);
            parentNode?.children.push(userNode!);
        } else {
            rootUsers.push(userNode!);
        }
    });
    
    // 3. Attach voters to their promoters
    allVoters.forEach(voter => {
        if (voter.status === 'activo' && userNodes.has(voter.promoterId)) {
            const promoterNode = userNodes.get(voter.promoterId);
            promoterNode?.children.push({
                id: voter.id,
                name: `${voter.firstName} ${voter.lastName}`,
                roleName: "Votante",
                children: [],
                value: 1, // Voters are the base unit
                isVoter: true,
            });
        }
    });

    // 4. Recursive function to calculate total voters (value) for each node
    const calculateValue = (node: ChartData): number => {
        if (node.isVoter) {
            return 1;
        }
        const childValues = node.children.reduce((sum, child) => sum + calculateValue(child), 0);
        node.value = childValues;
        return node.value;
    };
    
    rootUsers.forEach(calculateValue);

    // 5. Create the final campaign root node
    const campaignRoot: ChartData = {
        id: campaign.id,
        name: campaign.name,
        roleName: "Campaña",
        isCampaign: true,
        children: rootUsers,
        value: 0
    };
    
    calculateValue(campaignRoot);

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
            tooltipText: "{name}\\n{roleName}\\nVotantes: {value}",
            cursor: "pointer",
        });

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
