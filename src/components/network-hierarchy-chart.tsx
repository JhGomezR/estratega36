
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
    color?: am5.Color;
}

const buildChartData = (campaign: Campaign, users: User[], voters: Voter[], roles: Role[]): ChartData => {
    const userMap = new Map<string, ChartData>();
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));

    const getColor = (dataContext: Partial<ChartData>): am5.Color => {
        if (dataContext.isCampaign) return am5.color(0x1A237E); // Deep Blue for campaign
        if (dataContext.isVoter) return am5.color(0xFFC107); // Gold for voter
        const roleName = dataContext.roleName?.toLowerCase() || '';
        if (roleName.includes('lider')) return am5.color(0x4CAF50); // Green for leader
        if (roleName.includes('promotor')) return am5.color(0x2196F3); // Blue for promoter
        return am5.color(0x9E9E9E); // Grey for others
    };

    users.forEach(user => {
        const chartNode: ChartData = {
            name: `${user.firstName} ${user.lastName}`,
            id: user.id,
            roleName: rolesMap.get(user.roleId) || 'Sin Rol',
            children: [],
            value: 0
        };
        chartNode.color = getColor(chartNode);
        userMap.set(user.id, chartNode);
    });
    
    const campaignVoters = voters.filter(voter => userMap.has(voter.promoterId));

    campaignVoters.forEach(voter => {
        const promoterNode = userMap.get(voter.promoterId);
        if (promoterNode && promoterNode.children) {
            const voterNode: ChartData = {
                name: `${voter.firstName} ${voter.lastName}`,
                id: voter.id,
                value: 1,
                roleName: "Votante",
                isVoter: true
            };
            voterNode.color = getColor(voterNode);
            promoterNode.children.push(voterNode);
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
        value: 0
    };
    campaignNode.color = getColor(campaignNode);
    
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
        
        series.nodes.template.set("forceHidden", true);
        series.links.template.set("visible", true);

        series.nodes.template.set("bullet", function(root, series, dataItem) {
          let container = am5.Container.new(root, {
            width: 180,
            height: 70,
            centerX: am5.p50,
            centerY: am5.p50,
            cursor: "pointer",
          });
          
          let rectangle = container.children.push(am5.Rectangle.new(root, {
            width: am5.p100,
            height: am5.p100,
            strokeWidth: 1,
            cornerRadiusTL: 8,
            cornerRadiusTR: 8,
            cornerRadiusBL: 8,
            cornerRadiusBR: 8,
            tooltipText: "{name}",
          }));
          
          rectangle.adapters.add("fill", function(fill, target) {
              const dataContext = dataItem.dataContext as ChartData;
              return dataContext.color || am5.color(0x9E9E9E);
          });
          
          container.children.push(am5.Label.new(root, {
            text: "{name}\n[bold]{roleName}[/]\nVotantes: {value}",
            fontSize: 14,
            fill: am5.color(0xffffff),
            centerX: am5.p50,
            centerY: am5.p50,
            textAlign: "center",
            oversizedBehavior: "wrap",
            populateText: true,
            width: 160
          }));
          
          container.events.on("click", function(e) {
            series.selectDataItem(dataItem);
            if (dataItem.get("children") && dataItem.get("children")!.length > 0) {
              dataItem.toggle();
            }
          });

          return am5.Bullet.new(root, {
            sprite: container
          });
        });
        
        series.links.template.setAll({
            strokeWidth: 2,
            stroke: am5.color(0xcccccc)
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
