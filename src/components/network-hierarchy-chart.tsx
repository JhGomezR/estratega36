
"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role, Campaign } from '@/lib/types';

interface ChartData {
    name: string;
    id: string;
    roleName?: string;
    children?: ChartData[];
    value: number; 
    isVoter?: boolean;
    isCampaign?: boolean;
}

const buildChartData = (campaign: Campaign, users: User[], voters: Voter[], roles: Role[]): ChartData => {
    const userMap = new Map<string, ChartData>();
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
        userMap.set(user.id, {
            name: `${user.firstName} ${user.lastName}`,
            id: user.id,
            roleName: rolesMap.get(user.roleId) || 'Sin Rol',
            children: [],
            value: 0,
        });
    });
    
    const campaignVoters = voters.filter(voter => userMap.has(voter.promoterId));

    campaignVoters.forEach(voter => {
        const promoterNode = userMap.get(voter.promoterId);
        if (promoterNode && promoterNode.children) {
            promoterNode.children.push({
                name: `${voter.firstName} ${voter.lastName}`,
                id: voter.id,
                value: 1,
                roleName: "Votante",
                isVoter: true,
            });
        }
    });

    const topLevelNodes: ChartData[] = [];
    users.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;

        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
             if (parentNode && parentNode.children) {
                parentNode.children.push(userNode);
            }
        } else {
            topLevelNodes.push(userNode);
        }
    });
    
    const calculateValues = (node: ChartData): number => {
        if (node.isVoter) {
            return 1;
        }

        if (!node.children || node.children.length === 0) {
            node.value = 0;
            return 0;
        }

        let totalVoters = 0;
        node.children.forEach(child => {
            totalVoters += calculateValues(child);
        });
        
        node.value = totalVoters;
        return totalVoters;
    };

    const campaignNode: ChartData = {
        name: campaign.name,
        roleName: campaign.campaignType,
        id: campaign.id,
        isCampaign: true,
        children: topLevelNodes,
        value: 0,
    };
    
    calculateValues(campaignNode);

    return campaignNode;
};

interface NetworkHierarchyChartProps {
    campaign: Campaign;
    users: User[];
    voters: Voter[];
    roles: Role[];
}

export const NetworkHierarchyChart = ({ campaign, users, voters, roles }: NetworkHierarchyChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const data = React.useMemo(() => buildChartData(campaign, users, voters, roles), [campaign, users, voters, roles]);

    useLayoutEffect(() => {
        if (!chartRef.current) return;

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
            topDown: true,
            downDepth: 1,
            initialDepth: 10,
            singleBranchOnly: false,
        }));
        
        series.nodes.template.setAll({
            toggleKey: "active",
            cursorOverStyle: "pointer"
        });

        // Set a larger radius directly on the template's circle
        series.nodes.template.get("circle")?.setAll({
            radius: 40, // Increased radius for all nodes
        });

        series.nodes.template.adapters.add("fill", (fill, target) => {
            const dataContext = target.dataItem?.dataContext as ChartData;
            if (dataContext) {
                if (dataContext.isCampaign) return am5.color(0x1A237E); // Deep Blue
                if (dataContext.isVoter) return am5.color(0xFFC107); // Gold
                if (dataContext.roleName?.toLowerCase().includes('lider')) return am5.color(0x4CAF50); // Green
                if (dataContext.roleName?.toLowerCase().includes('promotor')) return am5.color(0x2196F3); // Blue
            }
            return am5.color(0x9E9E9E); // Grey for others
        });

        series.labels.template.setAll({
            text: "{name}\n[bold]{roleName}[/]\nVotantes: {value}",
            populateText: true,
            fontSize: 16, // Increased font size
            fill: am5.color(0xffffff),
            centerX: am5.p50,
            textAlign: "center",
        });

        series.links.template.set("strokeWidth", 2);

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
