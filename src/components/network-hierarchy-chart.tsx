
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
            cursorOverStyle: "pointer",
            toggleKey: "active", // This enables expand/collapse on click
        });

        // Hide default circle
        series.nodes.template.set("forceHidden", true);
        
        // Custom bullet for nodes
        series.nodes.template.set("bullet", (root, _series, dataItem) => {
            const chartData = dataItem.dataContext as ChartData;

            if (chartData.isVoter) {
                return am5.Bullet.new(root, {
                    sprite: am5.Circle.new(root, {
                        radius: 5,
                        fill: am5.color(0x86a873),
                    })
                });
            }

            const container = am5.Container.new(root, {
                width: am5.p100,
                height: am5.p100,
                cursorOverStyle: "pointer"
            });

            const rectangle = container.children.push(am5.Rectangle.new(root, {
                width: 220,
                height: 60,
                cornerRadiusTL: 10,
                cornerRadiusTR: 10,
                cornerRadiusBL: 10,
                cornerRadiusBR: 10,
            }));
            
            rectangle.adapters.add("fill", () => {
                if (chartData.isCampaign) return am5.color(0x095256);
                const roleName = chartData.roleName || "";
                if (roleName.toLowerCase().includes('director')) return am5.color(0x087f8c);
                if (roleName.toLowerCase().includes('lider')) return am5.color(0x5aaa95);
                if (roleName.toLowerCase().includes('promotor')) return am5.color(0x86a873);
                return am5.color(0xbb9f06);
            });
            
            return am5.Bullet.new(root, {
                sprite: container
            });
        });
        
        series.labels.template.setAll({
            text: "{name}\n[fontSize:14px; bold]{roleName}[/]\n[fontSize:12px]Votantes: {value}[/]",
            fill: am5.color(0xffffff),
            fontSize: 16,
            populateText: true,
            centerX: am5.p50,
            centerY: am5.p50,
            textAlign: "center"
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
