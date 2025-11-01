
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
    value?: number;
    isVoter?: boolean;
    isCampaign?: boolean;
    isUser?: boolean;
    data?: any;
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
            isUser: true,
            data: user,
        });
    });

    const campaignVoters = voters.filter(voter => userMap.has(voter.promoterId));

    campaignVoters.forEach(voter => {
        const promoterNode = userMap.get(voter.promoterId);
        promoterNode?.children?.push({
            name: `${voter.firstName} ${voter.lastName}`,
            id: voter.id,
            roleName: 'Votante',
            value: 1,
            isVoter: true,
            data: voter,
        });
    });

    const topLevelNodes: ChartData[] = [];

    users.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;

        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
            parentNode?.children?.push(userNode);
        } else {
            topLevelNodes.push(userNode);
        }
    });

    // Calculate values recursively
    const calculateValue = (node: ChartData): number => {
        if (node.isVoter) {
            node.value = 1;
            return 1;
        }
        if (!node.children || node.children.length === 0) {
            node.value = 1; // User without children/voters counts as 1
            return 1;
        }
        const sum = node.children.reduce((acc, child) => acc + calculateValue(child), 0);
        node.value = sum;
        return sum;
    };
    
    topLevelNodes.forEach(calculateValue);

    return {
        name: campaign.name,
        id: campaign.id,
        roleName: 'Campaña',
        isCampaign: true,
        children: topLevelNodes,
        data: campaign
    };
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
        
        const theme = am5themes_Animated.new(root);
        root.setThemes([theme]);

        let chart = root.container.children.push(
            am5.Container.new(root, {
                width: am5.percent(100),
                height: am5.percent(100),
                layout: root.verticalLayout
            })
        );
        
        let series = chart.children.push(
            am5hierarchy.Tree.new(root, {
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                idField: "id",
                downDepth: 1,
                initialDepth: 3,
                topDown: true,
                orientation: "vertical",
                nodePaddingOuter: 10,
                nodePaddingInner: 10,
            })
        );
        
        // This is the key to make nodes interactive
        series.nodes.template.setAll({
            toggleKey: "active",
            cursorOverStyle: "pointer",
        });

        // Hide default circle visuals
        series.circles.template.set("forceHidden", true);
        series.outerCircles.template.set("forceHidden", true);
        series.labels.template.set("forceHidden", true);

        series.links.template.setAll({
            strokeWidth: 1,
            strokeOpacity: 0.7,
        });
        
        series.nodes.template.events.on("dataitemchanged", function(ev) {
            let target = ev.target;
            if (!target) return;
            let dataItem = target.dataItem;
            if (!dataItem) return;
            const dataContext = dataItem.get("dataContext") as ChartData;
            if (!dataContext) return;

            let container = am5.Container.new(root, {
                width: 160,
                height: 60,
                layout: root.verticalLayout,
                centerX: am5.p50,
                centerY: am5.p50,
            });

            let rect = am5.Rectangle.new(root, {
                width: container.get("width"),
                height: container.get("height"),
                cornerRadiusTL: 10,
                cornerRadiusTR: 10,
                cornerRadiusBL: 10,
                cornerRadiusBR: 10,
                fillOpacity: dataContext.isVoter ? 0.1 : 0.3,
                fill: dataContext.isVoter ? am5.color(0x9CA3AF) : am5.color(0x3B82F6),
            });

            let nameLabel = am5.Label.new(root, {
                text: "[bold]{name}[/]",
                populateText: true,
                centerX: am5.p50,
                dy: dataContext.isVoter ? 0 : -5,
                textAlign: "center"
            });

            let roleLabel = am5.Label.new(root, {
                text: "[fontSize: 10px]{roleName}[/]",
                populateText: true,
                centerX: am5.p50,
                dy: dataContext.isVoter ? 0 : 5,
                textAlign: "center"
            });
            
            container.children.push(rect);
            container.children.push(nameLabel);

            if (!dataContext.isVoter) {
                container.children.push(roleLabel);
            }
            
            // Set the container as the main visual element for the node
            target.children.push(container);
            
            // Re-bind data context to the new labels
            nameLabel.data.setAll({
                name: dataContext.name
            });
            roleLabel.data.setAll({
                roleName: dataContext.roleName
            });
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
