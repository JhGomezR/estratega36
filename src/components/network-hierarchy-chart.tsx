
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
            isVoter: false,
            isUser: true,
        });
    });

    voters.forEach(voter => {
        if (voter.promoterId && userMap.has(voter.promoterId)) {
            const promoterNode = userMap.get(voter.promoterId);
            promoterNode?.children?.push({
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
            parentNode?.children?.push(userNode);
        } else {
            topLevelNodes.push(userNode);
        }
    });
    
    // Add value to user nodes based on their children count for sizing
    userMap.forEach(userNode => {
        userNode.value = userNode.children ? userNode.children.length : 0;
    })

    return {
        name: campaign.name,
        id: campaign.id,
        roleName: 'Campaña',
        isCampaign: true,
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
                initialDepth: 2,
                topDown: true,
                orientation: "vertical",
                nodePaddingOuter: 10,
                nodePaddingInner: 10,
            })
        );
        
        series.nodes.template.setAll({
          toggleKey: "active",
          cursorOverStyle: "pointer"
        });

        series.circles.template.adapters.add("radius", (radius, target) => {
            const dataContext = target.dataItem?.get("dataContext") as ChartData;
            return dataContext?.isVoter ? 10 : 20;
        });

        series.outerCircles.template.adapters.add("radius", (radius, target) => {
            const dataContext = target.dataItem?.get("dataContext") as ChartData;
            return dataContext?.isVoter ? 10 : 20;
        });
        
        series.circles.template.adapters.add("fill", (fill, target) => {
             const dataContext = target.dataItem?.get("dataContext") as ChartData;
             if (dataContext?.isCampaign) return am5.color(0x3B82F6);
             if (dataContext?.isVoter) return am5.color(0x9CA3AF);
             return am5.color(0x10B981);
        });

        series.links.template.setAll({
            strokeWidth: 1,
            strokeOpacity: 0.7,
        });

        series.labels.template.setAll({
          populateText: true,
          text: "[bold]{name}[/]\n{roleName}",
          dy: 30,
          centerX: am5.percent(50),
          textAlign: "center",
          oversizedBehavior: "none",
        });

        const userIconSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FFFFFF'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
        const campaignIconSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23FFFFFF' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.236L19.03 8.5 12 12.035 4.97 8.5 12 4.236zM4 10.392l8 4.545v7.l-8-4.545v-7z'/%3E%3C/svg%3E";

        let plus = am5.Picture.new(root, {
            width: 16, height: 16,
            centerX: am5.percent(100),
            centerY: am5.percent(100),
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Ccircle cx='12' cy='12' r='11' fill='%236b7280'/%3E%3Cpath d='M12 6v12m-6-6h12' stroke='white' stroke-width='2'/%3E%3C/svg%3E"
        });
        plus.states.create("hidden", { visible: true });
        plus.states.create("active", { visible: false });

        let minus = am5.Picture.new(root, {
            width: 16, height: 16,
            centerX: am5.percent(100),
            centerY: am5.percent(100),
            src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Ccircle cx='12' cy='12' r='11' fill='%236b7280'/%3E%3Cpath d='M6 12h12' stroke='white' stroke-width='2'/%3E%3C/svg%3E"
        });
        minus.states.create("hidden", { visible: false });
        minus.states.create("active", { visible: true });
        
        series.nodes.template.children.push(plus);
        series.nodes.template.children.push(minus);

        series.nodes.template.adapters.add("opacity", function(opacity, target) {
            const dataContext = target.dataItem?.get("dataContext") as ChartData;
            if (dataContext.children && dataContext.children.length > 0) {
                // has children
            } else {
                target.children.each(function(child) {
                    if (child === plus || child === minus) {
                        child.set("visible", false)
                    }
                })
            }
            return opacity;
        });

        series.nodes.template.adapters.add("x", function(x, target) {
            const dataContext = target.dataItem?.get("dataContext") as ChartData;
            if (dataContext.isVoter) {
                const icon = target.children.each(child => {
                    if(child instanceof am5.Picture) child.set("visible", false)
                })
            } else {
                 target.children.push(
                    am5.Picture.new(root, {
                        width: dataContext.isCampaign ? 24 : 20,
                        height: dataContext.isCampaign ? 24 : 20,
                        centerX: am5.percent(50),
                        centerY: am5.percent(50),
                        src: dataContext.isCampaign ? campaignIconSvg : userIconSvg
                    })
                );
            }
            return x
        })


        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data, userIconSvg, campaignIconSvg]);

    if (!data || (data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay usuarios en esta campaña para mostrar en la red.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
