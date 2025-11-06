
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
    avatar?: string;
    children?: ChartData[];
    value: number; // Represents direct voters for a user node
    teamCount?: number;
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
            avatar: user.avatar,
            children: [],
            value: 0,
            teamCount: 0
        });
    });

    const campaignVoters = voters.filter(voter => userMap.has(voter.promoterId));

    campaignVoters.forEach(voter => {
        const promoterNode = userMap.get(voter.promoterId);
        if (promoterNode) {
            if (!promoterNode.children) {
                promoterNode.children = [];
            }
            // Voter nodes are added for value calculation but can be visually simplified
            promoterNode.children.push({
                name: `${voter.firstName} ${voter.lastName}`,
                id: voter.id,
                value: 1,
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
             if (parentNode) {
                if (!parentNode.children) {
                    parentNode.children = [];
                }
                parentNode.children.push(userNode);
            }
        } else {
            topLevelNodes.push(userNode);
        }
    });
    
    // Recursive function to calculate values and counts
    const calculateValues = (node: ChartData): { totalVoters: number, teamSize: number } => {
        if (node.isVoter) {
            return { totalVoters: 1, teamSize: 0 };
        }

        if (!node.children || node.children.length === 0) {
            node.value = 0;
            node.teamCount = 0;
            return { totalVoters: 0, teamSize: 0 };
        }

        let directVoters = 0;
        let directTeamMembers = 0;
        let subTeamVoters = 0;

        node.children.forEach(child => {
            if (child.isVoter) {
                directVoters++;
            } else {
                directTeamMembers++;
                const result = calculateValues(child);
                subTeamVoters += result.totalVoters;
            }
        });
        
        node.value = directVoters; // Direct voters under this person
        node.teamCount = directTeamMembers; // Direct team members
        
        // Filter out voter children from the final chart structure to avoid rendering them as full nodes
        node.children = node.children.filter(child => !child.isVoter);
        
        return { totalVoters: directVoters + subTeamVoters, teamSize: directTeamMembers };
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
    campaignNode.value = campaignVoters.length; // Total voters for the campaign

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
    const { theme } = useTheme();
    const data = React.useMemo(() => buildChartData(campaign, users, voters, roles), [campaign, users, voters, roles]);

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);
        
        const animatedTheme = am5themes_Animated.new(root);
        root.setThemes([animatedTheme]);

        let zoomableContainer = root.container.children.push(
          am5.ZoomableContainer.new(root, {
            width: am5.p100,
            height: am5.p100,
            wheelable: true,
            pinchZoom: true
          })
        );
        
        let series = zoomableContainer.contents.children.push(am5hierarchy.Tree.new(root, {
            valueField: "value",
            categoryField: "name",
            childDataField: "children",
            orientation: "vertical",
            topDown: true,
            downDepth: 1,
            initialDepth: 5,
            singleBranchOnly: false,
        }));
        
        series.nodes.template.setAll({
            toggleKey: "active",
            cursorOverStyle: "pointer",
        });

        // This is the correct way to add a custom graphic (the outer circle)
        // It's added as a bullet, not by pushing to children directly
        series.bullets.push(function() {
            let container = am5.Container.new(root, {
                width: am5.p100,
                height: am5.p100,
            });

            let outerCircle = container.children.push(am5.Circle.new(root, {
                radius: 25,
                fillOpacity: 0,
                strokeWidth: 2,
            }));

            // Logic to show/hide and style the outer circle
            container.adapters.add("x", (x, target) => {
                let dataItem = target.dataItem as am5.DataItem<am5hierarchy.IHierarchyNodeDataItem> | undefined;
                if (dataItem) {
                    // Hide outer circle if it has no children
                    if (!dataItem.get("children") || dataItem.get("children")!.length === 0) {
                        outerCircle.set("forceHidden", true);
                    } else {
                        outerCircle.set("forceHidden", false);
                        // Set dotted for collapsed state
                        if (!dataItem.get("active")) {
                             outerCircle.set("strokeDasharray", [3, 3]);
                        } else {
                             outerCircle.set("strokeDasharray", undefined);
                        }
                    }
                }
                return x;
            });
            
            return am5.Bullet.new(root, {
                sprite: container
            });
        });
        
        series.circles.template.setAll({
            radius: 20,
            fillOpacity: 0.8
        });

        series.labels.template.setAll({
            text: "{name}\n[fontSize:12px]{roleName}[/]",
            fill: am5.color(0x000000),
            fontSize: 14,
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
    }, [data, theme]);

    if (!data || (data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay usuarios en esta campaña para mostrar en la red.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
