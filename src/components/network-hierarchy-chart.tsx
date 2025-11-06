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
                roleName: 'Votante',
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

    const calculateValue = (node: ChartData): number => {
        if (!node.children || node.children.length === 0) {
            node.value = node.isVoter ? 1 : 0;
            return node.value;
        }
        const sum = node.children.reduce((acc, child) => acc + calculateValue(child), 0);
        node.value = sum;
        return sum;
    };
    
    topLevelNodes.forEach(calculateValue);
    
    const totalValue = calculateValue({ name: "", id: "", children: topLevelNodes });

    return {
        name: campaign.name,
        id: campaign.id,
        roleName: 'Campaña',
        value: totalValue,
        children: topLevelNodes,
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

        root.setThemes([am5themes_Animated.new(root)]);

        let series = root.container.children.push(
            am5hierarchy.Tree.new(root, {
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                orientation: "vertical",
                topDown: true,
                downDepth: 1,
                initialDepth: 5,
                singleBranchOnly: false,
            })
        );
        
        series.nodes.template.setAll({
            toggleKey: "active",
            cursorOverStyle: "pointer",
        });

        series.circles.template.adapters.add("radius", function (radius, target) {
            const dataContext = target.dataItem?.dataContext as ChartData;
            if (dataContext?.isVoter) {
                return 15;
            }
            return 30;
        });

        series.circles.template.adapters.add("fill", function (fill, target) {
            const dataContext = target.dataItem?.dataContext as ChartData;
            if (!dataContext) return fill;

            const role = dataContext.roleName?.toLowerCase();
            if (role === 'campaña') return am5.color(0x095256);
            if (role?.includes('lider')) return am5.color(0x007bff);
            if (role?.includes('promotor')) return am5.color(0x28a745);
            if (role === 'votante') return am5.color(0xffc107);
            
            return am5.color(0x6c757d);
        });

        series.labels.template.setAll({
            text: "{name}\n[fontSize:10px]{roleName}: {value}[/]",
            populateText: true,
            textAlign: "center",
            centerY: am5.p50,
            centerX: am5.p50,
            fontSize: 12,
            fill: am5.color(0xffffff),
        });

        series.links.template.setAll({
            strokeWidth: 1.5,
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
