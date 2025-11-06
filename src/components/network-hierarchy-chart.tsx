
"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role, Campaign } from '@/lib/types';
import { useTheme } from 'next-themes';

interface ChartData {
    name: string;
    id: string;
    roleName?: string;
    children?: ChartData[];
    value: number; // Represents total voters in the hierarchy below
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
        if (promoterNode) {
            if (!promoterNode.children) {
                promoterNode.children = [];
            }
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
    const { resolvedTheme } = useTheme();
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
            cursorOverStyle: "pointer",
        });

        series.circles.template.adapters.add("radius", (radius, target) => {
            const dataItem = target.dataItem as am5.DataItem<am5hierarchy.IHierarchyNodeDataItem>;
            if (dataItem) {
                const isVoter = (dataItem.get("dataContext") as ChartData)?.isVoter;
                return isVoter ? 8 : 12;
            }
            return radius;
        });

        series.labels.template.setAll({
            text: "{name}\n[fontSize:10px]{roleName}[/]",
            fill: am5.color(0xffffff),
            fontSize: 14,
            populateText: true,
            centerX: am5.p50,
            centerY: am5.p50,
            textAlign: "center"
        });

        series.links.template.set("strokeWidth", 2);

        // Add the outer circle via a bullet
        series.bullets.push(function() {
            let bulletContainer = am5.Container.new(root, {});

            let outerCircle = bulletContainer.children.push(am5.Circle.new(root, {
                radius: 15,
                fillOpacity: 0,
                strokeWidth: 2,
                stroke: am5.color(0xaaaaaa),
                strokeDasharray: [3, 3] // Dotted by default
            }));

            // Hide for voters or nodes without children
            outerCircle.adapters.add("forceHidden", (hidden, target) => {
                let dataItem = target.parent?.dataItem as am5.DataItem<am5hierarchy.IHierarchyNodeDataItem>;
                if (dataItem) {
                    const chartData = dataItem.get("dataContext") as ChartData;
                    if (!chartData || chartData.isVoter || !dataItem.get("children") || dataItem.get("children")!.length === 0) {
                        return true;
                    }
                }
                return hidden;
            });

            // Change to solid when active
            outerCircle.states.create("active", {
                strokeDasharray: undefined
            });
            
            return am5.Bullet.new(root, {
                sprite: bulletContainer
            });
        });

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data, resolvedTheme]);

    if (!data || (data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay usuarios en esta campaña para mostrar en la red.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
