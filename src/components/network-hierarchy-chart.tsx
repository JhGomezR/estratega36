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
}

const buildChartData = (campaign: Campaign, users: User[], voters: Voter[], roles: Role[]): ChartData => {
    const userMap = new Map<string, ChartData>();
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));
    const adminRoleNames = ['admin', 'super_admin', 'super', 'administrador'];

    const campaignUsers = users.filter(user => {
        const userRole = rolesMap.get(user.roleId)?.toLowerCase() || '';
        return user.campaignIds.includes(campaign.id) && !adminRoleNames.includes(userRole);
    });

    campaignUsers.forEach(user => {
        userMap.set(user.id, {
            name: `${user.firstName} ${user.lastName}`,
            id: user.id,
            roleName: rolesMap.get(user.roleId) || 'Sin Rol',
            children: [],
            isVoter: false,
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
    
    campaignUsers.forEach(user => {
        const userNode = userMap.get(user.id);
        if (!userNode) return;
        
        if (user.parentId && userMap.has(user.parentId)) {
            const parentNode = userMap.get(user.parentId);
            parentNode?.children?.push(userNode);
        } else {
            topLevelNodes.push(userNode);
        }
    });

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

    const userIconSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FFFFFF'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    const campaignIconSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23FFFFFF' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.236L19.03 8.5 12 12.035 4.97 8.5 12 4.236zM4 10.392l8 4.545v7.l-8-4.545v-7z'/%3E%3C/svg%3E";

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);
        
        const theme = am5themes_Animated.new(root);
        root.setThemes([theme]);
        
        let series = root.container.children.push(
            am5hierarchy.Tree.new(root, {
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                idField: "id",
                downDepth: 1,
                initialDepth: 5,
                topDown: true,
                orientation: "vertical",
                nodePaddingOuter: 30,
                nodePaddingInner: 10,
            })
        );
        
        series.nodes.template.setAll({
            toggleKey: "none",
            cursorOverStyle: "default"
        });

        series.circles.template.setAll({
            radius: 20,
            strokeWidth: 2
        });

        series.circles.template.adapters.add("radius", (radius, target) => {
             const dataContext = target.dataItem?.get("dataContext") as ChartData;
             if (dataContext?.isVoter) return 10;
             if (dataContext?.isCampaign) return 25;
             return radius;
        });

        series.circles.template.adapters.add("fill", (fill, target) => {
             const dataContext = target.dataItem?.get("dataContext") as ChartData;
             if (dataContext?.isCampaign) return am5.color(0x3B82F6);
             return fill;
        });
        
        series.outerCircles.template.setAll({
            strokeWidth: 2
        });

        series.outerCircles.template.adapters.add("radius", (radius, target) => {
             const dataContext = target.dataItem?.get("dataContext") as ChartData;
             if (dataContext?.isVoter) return 10;
             if (dataContext?.isCampaign) return 25;
             return radius;
        });
        
        series.labels.template.setAll({
          populateText: true,
          text: "[bold]{name}[/]\n{roleName}",
          dy: 30,
          centerX: am5.percent(50),
          textAlign: "center",
          oversizedBehavior: "none",
        });

        series.nodes.template.setup = function(target) {
            target.events.on("dataitemchanged", function(ev) {
                const dataItem = ev.target.dataItem;
                if (!dataItem) return;

                const dataContext = dataItem.dataContext as ChartData;
                const iconSrc = dataContext.isCampaign ? campaignIconSvg : userIconSvg;

                if (!dataContext.isVoter) {
                     const circle = am5.Circle.new(root, { radius: 20 });

                     if (dataContext.isCampaign) {
                         circle.set("radius", 25);
                     }
                    
                     target.children.push(
                        am5.Picture.new(root, {
                            width: dataContext.isCampaign ? 28 : 22,
                            height: dataContext.isCampaign ? 28 : 22,
                            centerX: am5.percent(50),
                            centerY: am5.percent(50),
                            src: iconSrc,
                            mask: circle
                        })
                    );
                }
            });
        };
        
        series.links.template.setAll({
            strokeWidth: 1,
            strokeOpacity: 0.7,
        });

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