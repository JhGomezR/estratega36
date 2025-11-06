
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
    value: number;
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

    const calculateValueAndCounts = (node: ChartData): number => {
        if (node.isVoter) {
            node.value = 1;
            return 1;
        }
        if (!node.children || node.children.length === 0) {
            node.value = 0;
            node.teamCount = 0;
            return 0;
        }
        
        const directUsers = node.children.filter(c => !c.isVoter);
        const directVoters = node.children.filter(c => c.isVoter);

        const childrenValue = node.children.reduce((acc, child) => acc + calculateValueAndCounts(child), 0);
        
        node.value = directVoters.length;
        node.teamCount = directUsers.length;
        
        return childrenValue + directVoters.length;
    };
    
    const campaignNode: ChartData = {
        name: campaign.name,
        roleName: campaign.campaignType,
        id: campaign.id,
        isCampaign: true,
        children: topLevelNodes,
        value: 0,
    };
    
    calculateValueAndCounts(campaignNode);

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
        
        root.setThemes([
          am5themes_Animated.new(root)
        ]);

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

        // Outer circle for indicating children state
        series.nodes.template.children.push(am5.Circle.new(root, {
            radius: 15,
            fillOpacity: 0,
            strokeWidth: 2,
            strokeDasharray: [3,3],
            stroke: am5.color(0x000000),
        }));

        series.nodes.template.states.create("active", {
           
        });

        // Main node circle
        series.circles.template.setAll({
            radius: 20,
            templateField: "nodeSettings"
        });

        series.circles.template.adapters.add("fill", function(fill, target) {
            let dataItem = target.dataItem as am5.DataItem<am5hierarchy.IHierarchyNodeDataItem>;
            if (dataItem) {
                if(dataItem.get("depth") === 0){
                    return am5.color(0x0975da)
                }
                return am5.color(0x6794dc);
            }
            return fill;
        });

        // Hide outer circle if node is active
        series.nodes.template.states.create("active", {}).on("enter", function(target) {
            let outerCircle = target.children.getIndex(0) as am5.Circle;
            outerCircle.set("strokeDasharray", undefined);
        });

        series.nodes.template.states.create("default", {}).on("enter", function(target) {
             let dataItem = target.dataItem as am5.DataItem<am5hierarchy.IHierarchyNodeDataItem>;
             if(dataItem.get("children") && dataItem.get("children")!.length > 0){
                let outerCircle = target.children.getIndex(0) as am5.Circle;
                outerCircle.set("strokeDasharray", [3,3]);
             }
        });


        // Configure labels
        series.labels.template.setAll({
            text: "{category}",
            fill: am5.color(0x000000),
            fontSize: 14,
            populateText: true,
            centerX: am5.p50,
            centerY: am5.p50,
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

    