
"use client";

import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5hierarchy from "@amcharts/amcharts5/hierarchy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { User, Voter, Role } from '@/lib/types';

interface ChartData {
    name: string;
    id: string;
    avatar?: string;
    roleName?: string;
    children?: ChartData[];
    value?: number;
}

const buildChartData = (users: User[], voters: Voter[], roles: Role[]): ChartData => {
    const userMap = new Map<string, ChartData>();
    const rolesMap = new Map(roles.map(r => [r.id, r.name]));

    users.forEach(user => {
        userMap.set(user.id, {
            name: `${user.firstName} ${user.lastName}`,
            id: user.id,
            avatar: user.avatar,
            roleName: rolesMap.get(user.roleId) || 'Sin Rol',
            children: [],
        });
    });

    // Add voters as children to their promoters
    voters.forEach(voter => {
        if (voter.promoterId && userMap.has(voter.promoterId)) {
            const promoterNode = userMap.get(voter.promoterId);
            promoterNode?.children?.push({
                name: `${voter.firstName} ${voter.lastName}`,
                id: voter.id,
                roleName: 'Votante',
                value: 1 // Give leaf nodes a value for layout purposes
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
    
    // Fallback if no admin found
    return {
        name: "Estructura de Campaña",
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

    useLayoutEffect(() => {
        if (!chartRef.current) return;

        let root = am5.Root.new(chartRef.current);
        
        root.setThemes([ am5themes_Animated.new(root) ]);
        
        const chart = root.container.children.push(
            am5.Container.new(root, {
                width: am5.percent(100),
                height: am5.percent(100),
                layout: root.verticalLayout
            })
        );
        
        chart.set("wheelX", "panX");
        chart.set("wheelY", "zoomX");
        
        chart.set("scrollbarX", am5.Scrollbar.new(root, {
            orientation: "horizontal"
        }));

        let series = chart.children.push(
            am5hierarchy.Tree.new(root, {
                valueField: "value",
                categoryField: "name",
                childDataField: "children",
                idField: "id",
                downDepth: 1,
                initialDepth: 5,
                topDown: true,
                orientation: "vertical",
                nodePaddingOuter: 20,
                nodePaddingInner: 10,
            })
        );
        
        series.nodes.template.setAll({
          tooltipText: "{name}\nRol: {roleName}"
        });
        
        // Use circles as background
        series.circles.template.setAll({
            radius: 30,
            fill: am5.color(0xcccccc),
        });
        
        // Configure outer circles for expand/collapse functionality
        series.outerCircles.template.setAll({
            radius: 30,
            strokeWidth: 2,
            stroke: am5.color(0xbbbbbb),
        });

        series.outerCircles.template.states.create("disabled", {
            strokeOpacity: 0.3,
            strokeDasharray: [2,2]
        });

        series.outerCircles.template.states.create("hoverDisabled", {
            strokeOpacity: 0.3,
            strokeDasharray: [2,2]
        });

        series.labels.template.setAll({
          dy: 45, // Position label below the node
          populateText: true,
          text: "[bold]{name}[/]\n{roleName}",
          textAlign: "center"
        });
        
        // Setup images for user nodes
        series.nodes.template.setup = function(target) {
            target.events.on("dataitemchanged", function(ev) {
                const dataItem = ev.target.dataItem;
                if (!dataItem) return;
                
                const dataContext = dataItem.dataContext as ChartData;
                
                // Only show avatar if it exists (for users)
                if (dataContext.avatar) {
                    target.children.push(am5.Picture.new(root, {
                        width: 50,
                        height: 50,
                        centerX: am5.percent(50),
                        centerY: am5.percent(50),
                        src: dataContext.avatar,
                        mask: am5.Circle.new(root, {
                            radius: am5.percent(50)
                        })
                    }));
                }
            });
        };
        
        series.links.template.setAll({
            strokeWidth: 2,
            strokeOpacity: 0.7,
        });

        series.data.setAll([data]);
        series.set("selectedDataItem", series.dataItems[0]);

        return () => {
            root.dispose();
        };
    }, [data]);

    if (!data || (data.id === 'root' && data.children?.length === 0)) {
        return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No hay datos de red para mostrar.</p></div>
    }

    return <div ref={chartRef} style={{ width: "100%", height: "100%" }}></div>;
};
