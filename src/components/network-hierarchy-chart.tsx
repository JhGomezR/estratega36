
"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role } from '@/lib/types';

interface ChartData {
    name: string;
    id: string;
    roleName?: string;
    children?: ChartData[];
    value?: number;
    isVoter?: boolean;
}

const buildChartData = (users: User[], voters: Voter[], roles: Role[]): ChartData => {
    const userMap = new Map<string, ChartData>();
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
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
                value: 1, // Leaf nodes need a value
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
             if (user.email !== 'axdrcys@gmail.com') {
                topLevelNodes.push(userNode);
            }
        }
    });

    const adminUser = users.find(u => u.email === 'axdrcys@gmail.com');
    if (adminUser) {
        const adminNode = userMap.get(adminUser.id);
        if (adminNode) {
            adminNode.children = [...(adminNode.children || []), ...topLevelNodes];
            return adminNode;
        }
    }
    
    return {
        name: "Campaña",
        id: "root",
        children: topLevelNodes,
    };
};


interface NetworkHierarchyChartProps {
    users: User[];
    voters: Voter[];
    roles: Role[];
}

export const NetworkHierarchyChart = ({ users, voters, roles }: NetworkHierarchyChartProps) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const data = React.useMemo(() => buildChartData(users, voters, roles), [users, voters, roles]);

    const userIconSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236B7280'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);
        
        const theme = am5themes_Animated.new(root);
        root.setThemes([theme]);
        
        const chart = root.container.children.push(
            am5.Container.new(root, {
                width: am5.percent(100),
                height: am5.percent(100),
                layout: root.verticalLayout
            })
        );
        
        chart.set("wheelX", "panX");
        chart.set("wheelY", "zoomX");
        
        let series = chart.children.push(
            am5hierarchy.Tree.new(root, {
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                idField: "id",
                downDepth: 1,
                initialDepth: 5,
                topDown: false,
                orientation: "horizontal",
                nodePaddingOuter: 30,
                nodePaddingInner: 10,
            })
        );

        // Configure circles for all nodes
        series.circles.template.setAll({
            radius: 20,
            fill: am5.color(0xffffff),
            stroke: am5.color(0xcccccc),
            strokeWidth: 2,
        });

        // Use adapter to change radius for voters
        series.circles.template.adapters.add("radius", function(radius, target) {
            const dataContext = target.dataItem?.dataContext as ChartData | undefined;
            return dataContext?.isVoter ? 10 : radius;
        });

        // Configure outer circles for nodes with children (for expand/collapse)
        series.outerCircles.template.setAll({
            strokeWidth: 2,
            stroke: am5.color(0xcccccc)
        });

        series.outerCircles.template.states.create("disabled", {
            strokeOpacity: 0.3,
        });

        series.outerCircles.template.states.create("hover", {
            stroke: am5.color(0xaaaaaa),
        });

        series.outerCircles.template.states.create("hoverDisabled", {
            stroke: am5.color(0xaaaaaa),
            strokeOpacity: 0.3
        });
        
        // Use adapter to change outer circle radius for voters (they don't have one, but for safety)
        series.outerCircles.template.adapters.add("radius", function(radius, target) {
            const dataContext = target.dataItem?.dataContext as ChartData | undefined;
            return dataContext?.isVoter ? 10 : radius;
        });

        
        series.labels.template.setAll({
          populateText: true,
          text: "[bold]{name}[/]\n{roleName}",
          dx: 30,
          textAlign: "left",
          oversizedBehavior: "none",
        });

        series.nodes.template.setup = function(target) {
            target.events.on("dataitemchanged", function(ev) {
                const dataItem = ev.target.dataItem;
                if (!dataItem) return;

                const dataContext = dataItem.dataContext as ChartData;
                
                if (!dataContext.isVoter) {
                    target.children.push(am5.Picture.new(root, {
                        width: 25,
                        height: 25,
                        centerX: am5.percent(50),
                        centerY: am5.percent(50),
                        src: userIconSvg,
                    }));
                }
            });
        };
        
        series.links.template.setAll({
            strokeWidth: 1,
            strokeOpacity: 0.7,
            stroke: am5.color(0x999999),
        });

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data, userIconSvg]);

    if (!data || (data.id === 'root' && data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay datos de red para mostrar.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};

